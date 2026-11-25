import { getCollection } from 'astro:content';

/** Published notes, newest first. Drafts show while you run `npm run dev` but never on the live site. */
export async function getNotes() {
  const all = await getCollection('notes', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
