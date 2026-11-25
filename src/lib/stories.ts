// "Stories": notes and travel albums (albums that have a written story), newest first.
// Used by the Stories page and the homepage's recent stories.
import { getNotes } from './notes';
import { getAlbums, albumCover } from './albums';
import { url } from './url';

export type Story = {
  kind: 'Note' | 'Travel';
  id: string;
  href: string;
  title: string;
  date: Date | null;
  description: string;
  /** A photo path or a built-in drawing name, for the card. */
  picture: string;
  location: string;
  /** Topics for the filter. Untagged notes count as "Notes", untagged travel stories as "Travel". */
  tags: string[];
};

export async function getStories(): Promise<Story[]> {
  const notes = (await getNotes()).map(
    (n): Story => ({
      kind: 'Note',
      id: n.id,
      href: url(`notes/${n.id}`),
      title: n.data.title,
      date: n.data.date,
      description: n.data.description || '',
      picture: n.data.cover || 'dusk',
      location: '',
      tags: n.data.tags.length ? n.data.tags : ['Notes'],
    }),
  );
  const travel = (await getAlbums())
    .filter((a) => a.body?.trim())
    .map(
      (a): Story => ({
        kind: 'Travel',
        id: a.id,
        href: url(`gallery/${a.id}`),
        title: a.data.title,
        date: a.data.date ?? null,
        description: a.data.description || '',
        picture: albumCover(a.data),
        location: a.data.location || '',
        tags: a.data.tags.length ? a.data.tags : ['Travel'],
      }),
    );
  return [...notes, ...travel].sort((x, y) => (y.date?.valueOf() ?? 0) - (x.date?.valueOf() ?? 0));
}

/** All tags in use, most used first: these become the filter buttons. */
export function tagsInUse(items: { tags: string[] }[]): string[] {
  const count = new Map<string, number>();
  for (const it of items) for (const t of it.tags) count.set(t, (count.get(t) || 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}
