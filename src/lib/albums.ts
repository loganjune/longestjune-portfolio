import { getCollection } from 'astro:content';
import { galleryAlbumOrder } from './content';

/**
 * Published albums, in the order set in the editor (src/data/gallery.json "albums").
 * Albums not in that list come last, by title. Drafts show while you run `npm run dev`
 * but never on the live site.
 */
export async function getAlbums() {
  const all = await getCollection('albums', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
  const rank = (id: string) => {
    const i = galleryAlbumOrder.indexOf(id);
    return i === -1 ? Infinity : i;
  };
  return all.sort((a, b) => rank(a.id) - rank(b.id) || a.data.title.localeCompare(b.data.title));
}

/** The album's cover: the chosen cover photo, else its first photo, else a built-in drawing. */
export function albumCover(data: { cover?: string; photos: { photo: string }[] }): string {
  return data.cover || data.photos[0]?.photo || 'sea';
}
