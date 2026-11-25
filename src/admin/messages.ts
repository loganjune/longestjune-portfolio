// Contact-form messages and content backups, from the Cloudflare API (worker/).
// The API checks the same GitHub sign-in, so only people who can edit the site can read these.
import { el, button, toast, confirmBox, plural, row, rowList } from './ui';
import type { View } from './app';

export class MessagesApi {
  constructor(private base: string, private token: string) {}

  async call<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(this.base.replace(/\/$/, '') + path, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || `Request failed (${res.status}).`);
    return out;
  }

  async messages(): Promise<any[]> {
    return (await this.call<{ messages: any[] }>('/messages')).messages;
  }

  async unreadCount(): Promise<number> {
    return unreadOf(await this.messages());
  }
}

const unreadOf = (messages: any[]) => messages.filter((m) => !m.is_read).length;

/** Runs an action and reports any error as a notice instead of failing silently. */
async function attempt(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export async function messagesView(api: MessagesApi | null, refresh: () => void): Promise<View> {
  if (!api) {
    return { title: 'Messages', jp: '受信箱', body: el('p', { cls: 'soft' }, 'The messages service isn’t connected. Add apiUrl to src/data/services.json.') };
  }
  const [messages, { backups }] = await Promise.all([api.messages(), api.call<{ backups: any[] }>('/backups')]);
  const unread = unreadOf(messages);

  const list = rowList(
    messages.map((m) => {
      const toggle = button(m.is_read ? 'Mark unread' : 'Mark read', () =>
        attempt(async () => {
          await api.call(`/messages/${m.id}/read`, { method: 'POST', body: JSON.stringify({ read: !m.is_read }) });
          refresh();
        }),
      'ed-link');
      const del = button('Delete', async () => {
        if (!(await confirmBox('Delete this message?', `The message from ${m.name} will be deleted for good.`, 'Delete', true))) return;
        await attempt(async () => {
          await api.call(`/messages/${m.id}`, { method: 'DELETE' });
          refresh();
        });
      }, 'ed-link');
      const reply = el('a', { cls: 'ed-link', href: `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent('Re: your message to longest june')}` }, 'Reply');
      return el(
        'li',
        { cls: `ed-msg${m.is_read ? '' : ' unread'}` },
        el('div', { cls: 'ed-msg-head' }, el('span', { cls: 'lab soft' }, fmt(m.created_at)), m.is_read ? null : el('span', { cls: 'ed-tag' }, 'New')),
        el('h3', {}, m.name, el('span', { cls: 'soft' }, ` · ${m.email}`)),
        el('p', { cls: 'ed-msg-text' }, m.message),
        el('div', { cls: 'ed-msg-actions' }, reply, toggle, del),
      );
    }),
    'No messages yet.',
  );

  const backupList = rowList(
    backups.slice(0, 20).map((b) => {
      const dl = button('Download', () =>
        attempt(async () => {
          const data = await api.call(`/backups/${b.commit_sha}`);
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const a = el('a', { href: URL.createObjectURL(blob), download: `longestjune-backup-${b.committed_at.slice(0, 10)}-${b.commit_sha.slice(0, 7)}.json` });
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }),
      'ed-link');
      return row(fmt(b.committed_at), [(b.message || '').split('\n')[0], el('span', { cls: 'soft' }, ` · ${b.files} files${b.complete ? '' : ' · in progress'}`)], dl);
    }),
    'No backups yet. The first appears within an hour.',
  );

  return {
    title: 'Messages',
    jp: '受信箱',
    intro: unread ? `${plural(unread, 'new message')}.` : 'From the contact form. You also get an email for each one.',
    body: el(
      'div',
      {},
      list,
      el('h2', { cls: 'ed-sub' }, 'Backups'),
      el('p', { cls: 'soft' }, 'After each publish, a copy of your notes and site text is saved to the database (checked hourly). GitHub also keeps every version.'),
      backupList,
    ),
  };
}
