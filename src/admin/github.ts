// Talks to GitHub for the editor.
//
// How saving works:
// - Every Save is a commit to the `editor-drafts` branch. Hostinger only publishes `main`,
//   so drafts are stored safely on GitHub without going live.
// - Publish moves `main` forward to match `editor-drafts`; Hostinger then rebuilds the site.
// - Discard resets `editor-drafts` back to `main`.
// - If `main` changed elsewhere (GitHub Desktop, the classic editor), it is merged into the
//   drafts branch first, so nothing is lost.

const REPO = 'loganjune/longestjun-web';
const MAIN = 'main';
const DRAFTS = 'editor-drafts';
const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export type Change = { path: string; text?: string; bytes?: Uint8Array; remove?: boolean };
export type Pending = { count: number; files: { path: string; status: string }[] };

export class GitHub {
  constructor(public token: string) {}

  async api<T = any>(path: string, init: RequestInit = {}, accept = 'application/vnd.github+json'): Promise<T> {
    const res = await fetch(path.startsWith('http') ? path : API + path, {
      ...init,
      headers: {
        Accept: accept,
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
      cache: 'no-store',
    });
    if (res.status === 204) return undefined as T;
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg =
        res.status === 401
          ? 'Your sign-in has expired. Please sign in again.'
          : res.status === 403 || res.status === 404
            ? body.message || 'GitHub refused this. Check that your account can edit the site.'
            : body.message || `GitHub error ${res.status}`;
      throw new GitHubError(msg, res.status);
    }
    if (accept.includes('raw')) return (await res.arrayBuffer()) as T;
    return res.json();
  }

  user() {
    return this.api<{ login: string; name: string | null }>('/user');
  }

  /** Can this account write to the repo? */
  async canEdit(): Promise<boolean> {
    const r = await this.api<{ permissions?: Record<string, boolean> }>(`/repos/${REPO}`);
    const p = r.permissions || {};
    return Boolean(p.push || p.maintain || p.admin);
  }

  private async headSha(branch: string): Promise<string | null> {
    try {
      const r = await this.api(`/repos/${REPO}/git/ref/heads/${branch}`);
      return r.object.sha;
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return null;
      throw e;
    }
  }

  private setRef(branch: string, sha: string, force = false) {
    return this.api(`/repos/${REPO}/git/refs/heads/${branch}`, { method: 'PATCH', body: JSON.stringify({ sha, force }) });
  }

  /** Makes sure the drafts branch exists and contains everything that is on main. */
  async syncDrafts(): Promise<void> {
    const mainSha = await this.headSha(MAIN);
    if (!mainSha) throw new GitHubError('The main branch is missing.', 404);
    const draftSha = await this.headSha(DRAFTS);
    if (!draftSha) {
      await this.api(`/repos/${REPO}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${DRAFTS}`, sha: mainSha }) });
      return;
    }
    if (draftSha === mainSha) return;
    const cmp = await this.api(`/repos/${REPO}/compare/${DRAFTS}...${MAIN}`);
    if (cmp.ahead_by === 0) return; // main has nothing new
    if (cmp.behind_by === 0) {
      await this.setRef(DRAFTS, mainSha); // drafts has nothing of its own: just catch up
      return;
    }
    try {
      await this.api(`/repos/${REPO}/merges`, {
        method: 'POST',
        body: JSON.stringify({ base: DRAFTS, head: MAIN, commit_message: 'Bring in changes from the live site (editor)' }),
      });
    } catch (e) {
      if (e instanceof GitHubError && e.status === 409) {
        throw new GitHubError(
          'The same file was changed both here and outside the editor. Publish or discard your drafts first, then try again.',
          409,
        );
      }
      throw e;
    }
  }

  /** Reads a text file from the drafts branch. Returns null if it doesn't exist. */
  async readText(path: string, ref = DRAFTS): Promise<string | null> {
    try {
      return new TextDecoder().decode(await this.readBytes(path, ref));
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return null;
      throw e;
    }
  }

  /** Reads a file's raw contents (e.g. a photo) from the drafts branch. */
  readBytes(path: string, ref = DRAFTS): Promise<ArrayBuffer> {
    return this.api<ArrayBuffer>(`/repos/${REPO}/contents/${encodePath(path)}?ref=${ref}`, {}, 'application/vnd.github.raw+json');
  }

  async listDir(path: string, ref = DRAFTS): Promise<{ name: string; path: string; type: string }[]> {
    try {
      return await this.api(`/repos/${REPO}/contents/${encodePath(path)}?ref=${ref}`);
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return [];
      throw e;
    }
  }

  /** Saves several files (and deletions) to the drafts branch as one commit. */
  async commit(changes: Change[], message: string, attempt = 0): Promise<void> {
    const head = await this.headSha(DRAFTS);
    if (!head) {
      await this.syncDrafts();
      return this.commit(changes, message, attempt);
    }
    const base = await this.api(`/repos/${REPO}/git/commits/${head}`);
    const tree = [];
    for (const c of changes) {
      if (c.remove) {
        tree.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
      } else if (c.bytes) {
        const blob = await this.api(`/repos/${REPO}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({ content: toBase64(c.bytes), encoding: 'base64' }),
        });
        tree.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
      } else {
        tree.push({ path: c.path, mode: '100644', type: 'blob', content: c.text ?? '' });
      }
    }
    const newTree = await this.api(`/repos/${REPO}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree }) });
    const commit = await this.api(`/repos/${REPO}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message: `${message} (editor)`, tree: newTree.sha, parents: [head] }),
    });
    try {
      await this.setRef(DRAFTS, commit.sha);
    } catch (e) {
      // Someone else saved at the same moment: try once more on top of their save.
      if (e instanceof GitHubError && e.status === 422 && attempt < 2) return this.commit(changes, message, attempt + 1);
      throw e;
    }
  }

  /** What's saved in drafts but not yet live. */
  async pending(): Promise<Pending> {
    const cmp = await this.api(`/repos/${REPO}/compare/${MAIN}...${DRAFTS}`);
    if (!cmp.ahead_by) return { count: 0, files: [] };
    return { count: cmp.files?.length || 0, files: (cmp.files || []).map((f: any) => ({ path: f.filename, status: f.status })) };
  }

  /** Makes the drafts live. */
  /**
   * Makes the drafts live as one tidy update: a single commit on main with everything saved since
   * the last publish (autosave makes many small draft saves; they don't clutter the live history).
   */
  async publish(message = 'Publish from the editor'): Promise<void> {
    await this.syncDrafts();
    const [mainSha, draftSha] = await Promise.all([this.headSha(MAIN), this.headSha(DRAFTS)]);
    if (!mainSha || !draftSha || mainSha === draftSha) return;
    const drafts = await this.api(`/repos/${REPO}/git/commits/${draftSha}`);
    const commit = await this.api(`/repos/${REPO}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message: `${message} (editor)`, tree: drafts.tree.sha, parents: [mainSha] }),
    });
    await this.setRef(MAIN, commit.sha); // main moves forward by one commit
    await this.setRef(DRAFTS, commit.sha, true); // drafts starts again from what's live
  }

  /** Throws away everything not yet published. */
  async discard(): Promise<void> {
    const mainSha = await this.headSha(MAIN);
    if (mainSha) await this.setRef(DRAFTS, mainSha, true);
  }
}

function encodePath(p: string) {
  return p.split('/').map(encodeURIComponent).join('/');
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
