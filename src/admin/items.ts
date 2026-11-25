// Pieces shared by the screens that edit one file per item: stories (notes), albums and projects.
import { createElement, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import type { GitHub, Change } from './github';
import { uniqueId } from './frontmatter';
import { saveBar } from './forms';
import { el } from './ui';

/** A header value as text ('' when missing; dates as YYYY-MM-DD). */
export const text = (v: unknown): string => (v === undefined || v === null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v));

/** A header list of words (tags), as text. */
export const words = (v: unknown): string[] => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);

/** Reads and parses every Markdown file in a folder. */
export async function readItems<T>(gh: GitHub, dir: string, parse: (id: string, text: string, path: string) => T, ext = /\.md$/): Promise<T[]> {
  const files = (await gh.listDir(dir)).filter((f) => f.type === 'file' && ext.test(f.name));
  return Promise.all(files.map(async (f) => parse(f.name.replace(ext, ''), (await gh.readText(f.path)) || '', f.path)));
}

/** Mounts a React component into a plain element; returns the element and a clean-up function. */
export function mount<P extends object>(component: ComponentType<P>, props: P) {
  const host = el('div', { cls: 'ed-react' });
  const root = createRoot(host);
  root.render(createElement(component, props));
  return { host, unmount: () => root.unmount() };
}

/**
 * The autosave bar for one item stored as `<dir>/<id>.md`. A new item waits for its title (which
 * also becomes its web address), then gets its id on the first save and becomes an ordinary item:
 * the address bar is updated in place, without a reload, so typing isn't interrupted.
 * `write` commits the item's file (plus anything else) and gets the path, the id and whether it's new.
 */
export function itemSaveBar(o: {
  gh: GitHub;
  dir: string;
  route: string;
  noun: string;
  id: string | null;
  path: string;
  title: () => string;
  write: (item: { path: string; id: string; title: string; fresh: boolean; photos: Change[] }) => Promise<void>;
  extra: HTMLElement | null;
  onSaved: () => void;
}) {
  let fresh = o.id === null;
  let id = o.id || '';
  let path = o.path;
  return saveBar(
    fresh ? 'Not saved yet' : 'All changes saved',
    async (photos) => {
      const title = o.title().trim();
      if (!title) throw new Error(`Please give the ${o.noun} a title.`);
      if (fresh) {
        id = uniqueId(title, new Set((await o.gh.listDir(o.dir)).map((f) => f.name.replace(/\.mdx?$/, ''))));
        path = `${o.dir}/${id}.md`;
      }
      await o.write({ path, id, title, fresh, photos });
      if (fresh) {
        fresh = false;
        history.replaceState(null, '', `#/${o.route}/${encodeURIComponent(id)}`);
      }
      o.onSaved();
    },
    o.extra,
    {
      ready: () =>
        !fresh ? true : !o.title().trim() ? `Give the ${o.noun} a title to start saving.` : document.activeElement?.classList.contains('ed-title-input') ? 'Saves when you leave the title.' : true,
    },
  );
}
