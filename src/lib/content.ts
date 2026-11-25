// The editable content files in src/data/. Each is edited on its own page in the web editor at /admin.
export { default as site } from '../data/site.json';
/** Public settings for the contact form and admin (no secrets live here). */
export { default as services } from '../data/services.json';
import nowFile from '../data/now.json';
import galleryFile from '../data/gallery.json';
import shopFile from '../data/shop.json';
import resumeFile from '../data/resume.json';

export const now = nowFile.now;
export const gallery = galleryFile.gallery;
/** The Drawings section under the photos on the Gallery page. */
export const galleryDrawings: { picture?: string; photo?: string; caption: string }[] = (galleryFile as { drawings?: [] }).drawings ?? [];
/** Album ids (file names in src/content/albums/) in the order they appear on the Gallery page. */
export const galleryAlbumOrder: string[] = galleryFile.albums ?? [];
/** The album shown large at the top of the Gallery page ('' for none). */
export const galleryFeatured: string = (galleryFile as { featured?: string }).featured ?? '';
export const shop = shopFile.shop;
export const resume = resumeFile.resume;

/** An uploaded photo wins over the built-in drawing. */
export function pic(item: { picture?: string; photo?: string }): string {
  return item.photo?.trim() || item.picture || 'sea';
}
