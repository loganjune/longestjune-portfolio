// longest june API: a Cloudflare Worker with a D1 (SQL) database.
//
//   POST   /contact              public: save a contact-form message (spam-checked) and email an alert
//   GET    /messages             editors only: list messages, newest first
//   POST   /messages/:id/read    editors only: mark a message read (body {"read": false} marks it unread)
//   DELETE /messages/:id         editors only: delete a message
//   GET    /backups              editors only: list content backups
//   GET    /backups/:sha         editors only: one backup's files, as JSON
//   (hourly)                     back up the latest published notes and src/data/*.json
//
// "Editors" are people with write access to the GitHub repo. They prove it by sending the GitHub
// token they got when signing in to the web editor; this worker asks GitHub whether that token may
// push to the repo. No passwords are stored here.

const GITHUB_API = 'https://api.github.com';
const UA = 'longestjune-api';
const LIMITS = { name: 200, email: 320, message: 5000 };
const BLOBS_PER_RUN = 40; // stays under Cloudflare's per-run request limit

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      const res = await route(request, env, ctx, origin);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (err) {
      console.error(err);
      return json({ error: 'Something went wrong. Please try again.' }, 500, cors);
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(backupLatest(env));
  },
};

async function route(request, env, ctx, origin) {
  const { pathname } = new URL(request.url);
  const m = request.method;

  if (pathname === '/' && m === 'GET') return json({ ok: true, service: 'longestjune-api' });
  if (pathname === '/contact' && m === 'POST') return contact(request, env, ctx, origin);

  if (pathname.startsWith('/messages') || pathname.startsWith('/backups')) {
    const who = await editor(request, env);
    if (!who) return json({ error: 'Please sign in with a GitHub account that can edit the site.' }, 401);

    if (pathname === '/messages' && m === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, created_at, name, email, message, is_read FROM messages ORDER BY created_at DESC, id DESC LIMIT 500',
      ).all();
      return json({ user: who, messages: results });
    }
    let hit = pathname.match(/^\/messages\/(\d+)\/read$/);
    if (hit && m === 'POST') {
      const body = await request.json().catch(() => ({}));
      await env.DB.prepare('UPDATE messages SET is_read = ? WHERE id = ?').bind(body.read === false ? 0 : 1, Number(hit[1])).run();
      return json({ ok: true });
    }
    hit = pathname.match(/^\/messages\/(\d+)$/);
    if (hit && m === 'DELETE') {
      await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(Number(hit[1])).run();
      return json({ ok: true });
    }
    if (pathname === '/backups' && m === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT s.commit_sha, s.committed_at, s.message, s.author, s.saved_at, s.complete,
                (SELECT COUNT(*) FROM snapshot_files f WHERE f.commit_sha = s.commit_sha) AS files
           FROM snapshots s ORDER BY s.committed_at DESC LIMIT 200`,
      ).all();
      return json({ backups: results });
    }
    hit = pathname.match(/^\/backups\/([0-9a-f]{40})$/);
    if (hit && m === 'GET') {
      const snap = await env.DB.prepare('SELECT * FROM snapshots WHERE commit_sha = ?').bind(hit[1]).first();
      if (!snap) return json({ error: 'No such backup.' }, 404);
      const { results } = await env.DB.prepare(
        `SELECT f.path, b.content FROM snapshot_files f LEFT JOIN blobs b ON b.blob_sha = f.blob_sha
          WHERE f.commit_sha = ? ORDER BY f.path`,
      ).bind(hit[1]).all();
      return json({ backup: snap, files: results });
    }
  }
  return json({ error: 'Not found' }, 404);
}

// ---------- contact form ----------

async function contact(request, env, ctx, origin) {
  if (!allowedOrigins(env).includes(origin)) return json({ error: 'Not allowed.' }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Please fill in the form again.' }, 400);
  }
  const name = clean(body.name, LIMITS.name);
  const email = clean(body.email, LIMITS.email);
  const message = String(body.message ?? '').trim().slice(0, LIMITS.message);

  // A hidden field people never see; bots tend to fill it in. Pretend it worked.
  if (body.website) return json({ ok: true });

  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Please add your name, a valid email and a message.' }, 400);
  }

  if (env.TURNSTILE_SECRET) {
    const check = await turnstileCheck(body.turnstile, request.headers.get('CF-Connecting-IP'), env.TURNSTILE_SECRET);
    if (!check.ok) {
      console.warn('turnstile failed', check.codes);
      return json({ error: `The spam check didn’t pass (${check.codes.join(', ') || 'no reason given'}). Please reload the page and try again.` }, 400);
    }
  } else if (env.ALLOW_NO_CAPTCHA !== '1') {
    return json({ error: 'The contact form isn’t fully set up yet. Please email instead.' }, 503);
  }

  await env.DB.prepare('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)').bind(name, email, message).run();
  if (env.RESEND_API_KEY) ctx.waitUntil(sendAlert(env, { name, email, message }).catch((e) => console.error('alert email failed', e)));
  return json({ ok: true });
}

/** Asks Cloudflare whether the spam-check token from the page is genuine. Codes explain a failure. */
async function turnstileCheck(token, ip, secret) {
  if (!token) return { ok: false, codes: ['missing-input-response'] };
  const form = new FormData();
  form.append('secret', secret.trim());
  form.append('response', String(token));
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  return { ok: data.success === true, codes: data['error-codes'] || [`http-${res.status}`] };
}

async function sendAlert(env, { name, email, message }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [env.NOTIFY_EMAIL],
      reply_to: email,
      subject: `New message from ${name}`.replace(/[\r\n]+/g, ' ').slice(0, 150),
      text: `${message}\n\n— ${name} <${email}>\n\nReply to this email to answer them. All messages: https://longestjune.com/admin/messages/`,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

// ---------- who is signed in ----------

const editorCache = new Map(); // token hash -> { login, until }

async function editor(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;

  const key = await sha256(token);
  const cached = editorCache.get(key);
  if (cached && cached.until > Date.now()) return cached.login;

  const headers = { Authorization: `Bearer ${token}`, 'User-Agent': UA, Accept: 'application/vnd.github+json' };
  const [repoRes, userRes] = await Promise.all([
    fetch(`${GITHUB_API}/repos/${env.REPO}`, { headers }),
    fetch(`${GITHUB_API}/user`, { headers }),
  ]);
  if (!repoRes.ok || !userRes.ok) return null;
  const repo = await repoRes.json();
  const user = await userRes.json();
  const p = repo.permissions || {};
  if (!(p.push || p.maintain || p.admin)) return null;

  editorCache.set(key, { login: user.login, until: Date.now() + 5 * 60 * 1000 });
  return user.login;
}

// ---------- backups ----------

function isContent(path) {
  return (/^src\/content\/.+\.mdx?$/.test(path)) || /^src\/data\/[^/]+\.json$/.test(path);
}

async function backupLatest(env) {
  // The repo is private, so these reads sign in with a read-only token (secret GITHUB_TOKEN).
  const auth = env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {};
  const gh = (path) => fetch(`${GITHUB_API}${path}`, { headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json', ...auth } });

  const commitRes = await gh(`/repos/${env.REPO}/commits/${env.BRANCH}`);
  if (!commitRes.ok) throw new Error(`GitHub commit lookup failed: ${commitRes.status}`);
  const commit = await commitRes.json();
  const sha = commit.sha;

  const existing = await env.DB.prepare('SELECT complete FROM snapshots WHERE commit_sha = ?').bind(sha).first();
  if (existing?.complete) return;

  if (!existing) {
    const treeRes = await gh(`/repos/${env.REPO}/git/trees/${sha}?recursive=1`);
    if (!treeRes.ok) throw new Error(`GitHub tree lookup failed: ${treeRes.status}`);
    const tree = await treeRes.json();
    const files = (tree.tree || []).filter((t) => t.type === 'blob' && isContent(t.path));
    const c = commit.commit || {};
    const stmts = [
      env.DB.prepare('INSERT OR IGNORE INTO snapshots (commit_sha, committed_at, message, author) VALUES (?, ?, ?, ?)').bind(
        sha,
        c.committer?.date || new Date().toISOString(),
        (c.message || '').slice(0, 500),
        c.author?.name || '',
      ),
      ...files.map((f) =>
        env.DB.prepare('INSERT OR IGNORE INTO snapshot_files (commit_sha, path, blob_sha) VALUES (?, ?, ?)').bind(sha, f.path, f.sha),
      ),
    ];
    await env.DB.batch(stmts);
  }

  // Fetch only file contents we haven't stored before.
  const { results: missing } = await env.DB.prepare(
    `SELECT f.blob_sha, MIN(f.path) AS path FROM snapshot_files f
       LEFT JOIN blobs b ON b.blob_sha = f.blob_sha
      WHERE f.commit_sha = ? AND b.blob_sha IS NULL
      GROUP BY f.blob_sha LIMIT ?`,
  ).bind(sha, BLOBS_PER_RUN + 1).all();

  for (const row of missing.slice(0, BLOBS_PER_RUN)) {
    const path = row.path.split('/').map(encodeURIComponent).join('/');
    const res = await fetch(`https://raw.githubusercontent.com/${env.REPO}/${sha}/${path}`, { headers: { 'User-Agent': UA, ...auth } });
    if (!res.ok) throw new Error(`Could not fetch ${row.path}: ${res.status}`);
    await env.DB.prepare('INSERT OR IGNORE INTO blobs (blob_sha, content) VALUES (?, ?)').bind(row.blob_sha, await res.text()).run();
  }
  // More than one run's worth left: the next hourly run carries on.
  if (missing.length <= BLOBS_PER_RUN) {
    await env.DB.prepare('UPDATE snapshots SET complete = 1 WHERE commit_sha = ?').bind(sha).run();
  }
}

// ---------- helpers ----------

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function corsHeaders(origin, env) {
  const h = { Vary: 'Origin' };
  if (allowedOrigins(env).includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

function clean(v, max) {
  return String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
