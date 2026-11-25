// Notes: the list, and the word-processor style editor. Notes are saved as Markdown files in
// src/content/notes/, exactly like before, so the site and the classic editor read them unchanged.
import type { GitHub } from './github';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter';
import { el, icon, button, busy, toast, confirmBox, row, rowList } from './ui';
import { renderFields } from './forms';
import { isImage } from '../lib/url';
import { richText } from './richtext';
import type { View } from './app';
import { TagsBox, STORY_TAGS } from './react/TagsField';
import { text as str, words, readItems, mount, itemSaveBar } from './items';

const DIR = 'src/content/notes';

type NoteMeta = { title: string; date: string; description: string; tags: string[]; cover: string; draft: boolean };

function parseNote(text: string): { meta: NoteMeta; body: string } {
  const { data, body } = parseFrontmatter(text);
  return { meta: { title: str(data.title), date: str(data.date).slice(0, 10), description: str(data.description), tags: words(data.tags), cover: str(data.cover), draft: data.draft === true }, body };
}

type NoteRow = { id: string; path: string; meta: NoteMeta };

async function loadNotes(gh: GitHub): Promise<NoteRow[]> {
  const rows = await readItems(gh, DIR, (id, text, path) => ({ id, path, meta: parseNote(text).meta }), /\.mdx?$/);
  return rows.sort((a, b) => b.meta.date.localeCompare(a.meta.date) || a.meta.title.localeCompare(b.meta.title));
}

function fmtDate(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d || 'No date';
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export async function notesList(gh: GitHub): Promise<View> {
  const notes = await loadNotes(gh);
  const newBtn = el('a', { href: '#/notes/new', cls: 'ed-btn solid' }, icon('plus', 16), ' New story');
  return {
    title: 'Stories',
    jp: '記録',
    intro: 'Your notes, listed on the Stories page. Travel stories are written inside their album, under Gallery. Drafts stay off the live site until you untick Draft.',
    actions: [newBtn],
    body: rowList(
      notes.map((n) => row(fmtDate(n.meta.date), [n.meta.title || n.id, n.meta.draft && el('span', { cls: 'ed-tag' }, 'Draft')], `#/notes/${encodeURIComponent(n.id)}`)),
      'No stories yet. Start one with New story.',
    ),
  };
}

export async function noteEditor(gh: GitHub, id: string | null, go: (hash: string) => void, onSaved: () => void): Promise<View> {
  const isNew = id === null;
  let path = '';
  let meta: NoteMeta = { title: '', date: new Date().toLocaleDateString('en-CA'), description: '', tags: [], cover: '', draft: true };
  let body = '';
  if (!isNew) {
    // Notes are .md, but the site also accepts .mdx, so look for either.
    let text: string | null = null;
    for (const ext of ['md', 'mdx']) {
      path = `${DIR}/${id}.${ext}`;
      if ((text = await gh.readText(path)) !== null) break;
    }
    if (text === null) throw new Error('That note doesn’t exist any more.');
    ({ meta, body } = parseNote(text));
  }

  const del = isNew
    ? null
    : button(
        'Delete story',
        async () => {
          if (!(await confirmBox('Delete this story?', `“${title.value || id}” will be removed when you publish. Until then you can still discard it.`, 'Delete', true))) return;
          await busy(del!, 'Deleting…', async () => {
            await gh.commit([{ path, remove: true }], `Delete note “${title.value || id}”`);
            toast('Story deleted from drafts.');
            onSaved();
            go('#/notes');
          });
        },
        'ed-btn danger quiet',
      );

  const bar = itemSaveBar({
    gh,
    dir: DIR,
    route: 'notes',
    noun: 'story',
    id,
    path,
    title: () => title.value,
    extra: del,
    onSaved,
    write: async ({ path, title: t, fresh, photos }) => {
      const m: NoteMeta = { title: t, date: date.value, description: desc.value.trim(), tags, cover: cover.photo || (cover.picture !== 'dusk' ? cover.picture : ''), draft: draft.checked };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(m.date)) throw new Error('Please pick a date.');
      await gh.commit([{ path, text: serializeFrontmatter(m, doc.getMarkdown()) }, ...photos], `${fresh ? 'Add' : 'Update'} note “${t}”`);
    },
  });
  const changed = bar.ctx.onChange;

  const title = el('input', { cls: 'ed-title-input', value: meta.title, placeholder: 'Title', 'aria-label': 'Title' });
  const date = el('input', { type: 'date', value: meta.date, 'aria-label': 'Date' });
  const desc = el('input', { value: meta.description, placeholder: 'Optional. Shown under the title in lists.' });
  // The cover is a photo or a built-in drawing; notes without one use the "dusk" drawing on their card.
  let tags = meta.tags;
  // The tag picker is a React component, mounted into this plain screen.
  const { host: tagsHost, unmount: unmountTags } = mount(TagsBox, {
    initial: meta.tags,
    suggestions: STORY_TAGS,
    hint: 'Used to filter the Stories page. With no tags, it shows under Notes.',
    onChange: (t: string[]) => {
      tags = t;
      bar.ctx.onChange();
    },
  });
  const cover = isImage(meta.cover) ? { picture: 'dusk', photo: meta.cover } : { picture: meta.cover || 'dusk', photo: '' };
  const draft = el('input', { type: 'checkbox', checked: meta.draft });
  for (const i of [title, date, desc]) i.addEventListener('input', changed);
  draft.addEventListener('change', changed);

  const doc = richText(body, bar.ctx, 'notes', 'Note text');

  return {
    title: isNew ? 'New story' : 'Edit story',
    jp: '記録',
    back: { href: '#/notes', label: 'All stories' },
    isDirty: bar.isDirty,
    flush: bar.flush,
    destroy: () => {
      doc.destroy();
      unmountTags();
    },
    body: el(
      'div',
      { cls: 'ed-note' },
      title,
      el(
        'div',
        { cls: 'ed-note-meta' },
        el('label', { cls: 'ed-field' }, el('span', { cls: 'lab' }, 'Date'), date),
        el('label', { cls: 'ed-field ed-grow' }, el('span', { cls: 'lab' }, 'Short description'), desc),
        el('label', { cls: 'ed-check' }, draft, el('span', {}, el('span', { cls: 'lab' }, 'Draft'), el('span', { cls: 'ed-hint' }, 'Hidden from the live site'))),
      ),
      tagsHost,
      renderFields([{ kind: 'picture', label: 'Cover', folder: 'notes', hint: 'Shown on the Stories page and at the top of the note.' }], cover, bar.ctx),
      doc.element,
    ),
    footer: bar.footer,
  };
}
