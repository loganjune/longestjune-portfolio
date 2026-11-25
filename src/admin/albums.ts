// The Gallery screen and the album editor. The screens themselves are React components
// (src/admin/react/); this file loads and saves their data and plugs them into the editor.
//
// Files:
// - src/data/gallery.json: single photos ("gallery"), drawings ("drawings") and the order of albums ("albums").
// - src/content/albums/<id>.md: one album. Details and photos in the header; the travel story below.
import type { GitHub, Change } from './github';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter';
import { button, busy, toast, confirmBox } from './ui';
import { saveBar } from './forms';
import { text as str, words, readItems, mount, itemSaveBar } from './items';
import type { View } from './app';
import GalleryEditor, { type GalleryChange } from './react/GalleryEditor';
import AlbumEditor from './react/AlbumEditor';

const DIR = 'src/content/albums';
const GALLERY = 'src/data/gallery.json';

export type Photo = { photo: string; caption: string; picture?: string };
export type Album = {
  id: string;
  title: string;
  location: string;
  date: string;
  description: string;
  cover: string;
  tags: string[];
  draft: boolean;
  /** Shown large at the top of the Gallery page. Kept in gallery.json ("featured"), not in the album's file. */
  featured: boolean;
  photos: Photo[];
  body: string;
};

function parseAlbum(id: string, text: string): Album {
  const { data, body } = parseFrontmatter(text);
  const photos = Array.isArray(data.photos) ? data.photos.map((p: any) => ({ photo: str(p?.photo), caption: str(p?.caption) })) : [];
  return {
    id,
    title: str(data.title),
    location: str(data.location),
    date: str(data.date).slice(0, 10),
    description: str(data.description),
    cover: str(data.cover),
    tags: words(data.tags),
    draft: data.draft === true,
    featured: false,
    photos,
    body,
  };
}

export const loadAlbums = (gh: GitHub) => readItems(gh, DIR, parseAlbum);

export type GalleryFile = { gallery: Photo[]; drawings?: Photo[]; albums: string[]; featured?: string };
async function readGallery(gh: GitHub): Promise<GalleryFile> {
  const g = JSON.parse((await gh.readText(GALLERY)) || '{}');
  return { ...g, gallery: g.gallery || [], albums: g.albums || [] };
}
const galleryFile = (g: GalleryFile): Change => ({ path: GALLERY, text: JSON.stringify(g, null, 2) + '\n' });

export const coverOf = (a: Pick<Album, 'cover' | 'photos'>) => a.cover || a.photos[0]?.photo || '';

/** The text of an album's file. */
function albumFile(a: Album, story: string): string {
  const kept = a.photos.filter((p) => p.photo).map((p) => ({ photo: p.photo, caption: p.caption.trim() }));
  const cover = kept.some((p) => p.photo === a.cover) ? a.cover : '';
  return serializeFrontmatter(
    { title: a.title.trim(), location: a.location.trim(), date: /^\d{4}-\d{2}-\d{2}$/.test(a.date) ? a.date : '', description: a.description.trim(), tags: a.tags, cover, draft: a.draft, photos: kept },
    story,
  );
}

// ---------- Gallery screen ----------

export async function galleryView(gh: GitHub, onSaved: () => void): Promise<View> {
  const gallery = await readGallery(gh);
  const albums = await loadAlbums(gh);
  const ids = new Set(albums.map((a) => a.id));
  // Keep the album order in step with the album files that exist.
  const known = gallery.albums.filter((id) => ids.has(id));
  gallery.albums = [...known, ...albums.map((a) => a.id).filter((id) => !known.includes(id)).sort()];

  let latest: GalleryChange = { gallery, changedAlbums: [] };
  const bar = saveBar('All changes saved', async (photos) => {
    // One save: the gallery list, plus any album that photos were moved into.
    const albumsChanged: Change[] = latest.changedAlbums.map((a) => ({ path: `${DIR}/${a.id}.md`, text: albumFile(a, a.body) }));
    await gh.commit([galleryFile(latest.gallery), ...albumsChanged, ...photos], 'Update gallery');
    onSaved();
  });
  const { host, unmount } = mount(GalleryEditor, {
    gallery,
    albums,
    ctx: bar.ctx,
    onChange: (next: GalleryChange) => {
      latest = next;
      bar.ctx.onChange();
    },
  });
  return {
    title: 'Gallery',
    jp: '写真',
    intro: 'Single photos, albums and drawings. The ★ album is featured at the top of the Gallery page. Drag to reorder, or drag a photo onto an album to move it in.',
    body: host,
    footer: bar.footer,
    isDirty: bar.isDirty,
    flush: bar.flush,
    destroy: unmount,
  };
}

// ---------- Album editor ----------

/** Changes gallery.json (album order, featured album) as one more file for the same save. */
async function editGallery(gh: GitHub, edit: (gallery: GalleryFile) => void): Promise<Change> {
  const gallery = await readGallery(gh);
  edit(gallery);
  return galleryFile(gallery);
}

export async function albumView(gh: GitHub, id: string | null, go: (hash: string) => void, onSaved: () => void): Promise<View> {
  const isNew = id === null;
  const path = isNew ? '' : `${DIR}/${id}.md`;
  let album: Album = { id: id || '', title: '', location: '', date: new Date().toLocaleDateString('en-CA'), description: '', cover: '', tags: [], draft: false, featured: false, photos: [], body: '' };
  if (!isNew) {
    const text = await gh.readText(path);
    if (text === null) throw new Error('That album doesn’t exist any more.');
    album = parseAlbum(id, text);
    album.featured = (await readGallery(gh)).featured === id;
  }
  let featuredNow = album.featured;

  // The React screen hands back the latest album on every change; the story's text is read at save time.
  let latest = album;
  let getStory = () => album.body;

  const del = isNew
    ? null
    : button(
        'Delete album',
        async () => {
          if (!(await confirmBox('Delete this album?', `“${latest.title || id}” and its page will be removed when you publish. Its photos stay in the repo’s history.`, 'Delete', true))) return;
          await busy(del!, 'Deleting…', async () => {
            await gh.commit([{ path, remove: true }, await editGallery(gh, (g) => {
              g.albums = g.albums.filter((x) => x !== id);
              if (g.featured === id) g.featured = '';
            })], `Delete album “${latest.title || id}”`);
            toast('Album deleted from drafts.');
            onSaved();
            go('#/gallery');
          });
        },
        'ed-btn danger quiet',
      );

  const bar = itemSaveBar({
    gh,
    dir: DIR,
    route: 'albums',
    noun: 'album',
    id,
    path,
    title: () => latest.title,
    extra: del,
    onSaved,
    write: async ({ path, id: newId, title, fresh, photos }) => {
      const a = latest;
      const changes: Change[] = [{ path, text: albumFile({ ...a, title }, getStory()) }, ...photos];
      // The gallery list changes for a new album (its place in the order) or a change of featured album.
      if (fresh || a.featured !== featuredNow) {
        changes.push(
          await editGallery(gh, (g) => {
            if (fresh) g.albums.push(newId);
            if (a.featured) g.featured = newId;
            else if (g.featured === newId) g.featured = '';
          }),
        );
      }
      await gh.commit(changes, `${fresh ? 'Add' : 'Update'} album “${title}”`);
      featuredNow = a.featured;
    },
  });

  const { host, unmount } = mount(AlbumEditor, {
    album,
    ctx: bar.ctx,
    onChange: (next: Album) => {
      latest = next;
      bar.ctx.onChange();
    },
    registerStory: (get: () => string) => (getStory = get),
  });

  return {
    title: isNew ? 'New album' : 'Edit album',
    jp: '写真',
    back: { href: '#/gallery', label: 'Gallery' },
    isDirty: bar.isDirty,
    flush: bar.flush,
    destroy: unmount,
    body: host,
    footer: bar.footer,
  };
}
