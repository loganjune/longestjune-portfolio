// The editor's Gallery screen: single photos (drag to reorder, captions, crop), then the albums
// (drag to set their order; click one to edit it; ★ features one at the top of the Gallery page), then
// the drawings (their own section on the Gallery page). Drag a single photo onto an album, or use
// its "Move to album" button, to move it into that album.
import { useCallback, useEffect, useRef, useState } from 'react';
import PhotoGrid, { Thumb } from './PhotoGrid';
import { Icon } from './Icon';
import { sortable, moveItem } from '../sortable';
import { coverOf, type Album, type Photo, type GalleryFile as Gallery } from '../albums';
import { el, button, toast, plural, dialog } from '../ui';
import { showImage } from '../images';
import type { Ctx } from '../forms';

export type GalleryChange = { gallery: Gallery; changedAlbums: Album[] };
type Props = { gallery: Gallery; albums: Album[]; ctx: Ctx; onChange: (c: GalleryChange) => void };

export default function GalleryEditor({ gallery: initial, albums: initialAlbums, ctx, onChange }: Props) {
  const [g, setG] = useState<Gallery>(initial);
  const [albums, setAlbums] = useState<Album[]>(initialAlbums);
  const changed = useRef(new Map<string, Album>()); // albums that received photos
  const latest = useRef({ g, albums });
  latest.current = { g, albums };
  const byId = new Map(albums.map((a) => [a.id, a]));

  const emit = useCallback(
    (nextG: Gallery, nextAlbums: Album[]) => {
      latest.current = { g: nextG, albums: nextAlbums };
      setG(nextG);
      setAlbums(nextAlbums);
      onChange({ gallery: nextG, changedAlbums: [...changed.current.values()] });
    },
    [onChange],
  );

  const setPhotos = useCallback((photos: Photo[]) => emit({ ...latest.current.g, gallery: photos }, latest.current.albums), [emit]);
  const setDrawings = useCallback((drawings: Photo[]) => emit({ ...latest.current.g, drawings }, latest.current.albums), [emit]);

  /** Moves single photo `i` to the end of album `id`. */
  const moveToAlbum = useCallback(
    (i: number, id: string) => {
      const { g: cur, albums: list } = latest.current;
      const photo = cur.gallery[i];
      const album = list.find((a) => a.id === id);
      if (!photo || !album) return;
      if (!photo.photo) return toast('Only uploaded photos can go into an album, not the built-in drawings.', 'error');
      const updated: Album = { ...album, photos: [...album.photos, { photo: photo.photo, caption: photo.caption }] };
      changed.current.set(id, updated);
      emit(
        { ...cur, gallery: cur.gallery.filter((_, j) => j !== i) },
        list.map((a) => (a.id === id ? updated : a)),
      );
      toast(`Moved to “${album.title || id}”.`);
    },
    [emit],
  );

  /** Adds newly uploaded photos straight into an album. */
  const addToAlbum = useCallback(
    (paths: string[], id: string) => {
      const { g: cur, albums: list } = latest.current;
      const album = list.find((a) => a.id === id);
      if (!album) return;
      const updated: Album = { ...album, photos: [...album.photos, ...paths.map((photo) => ({ photo, caption: '' }))] };
      changed.current.set(id, updated);
      emit(cur, list.map((a) => (a.id === id ? updated : a)));
      toast(`Added ${paths.length} photo${paths.length === 1 ? '' : 's'} to “${album.title || id}”.`);
    },
    [emit],
  );

  /** The albums, in their Gallery order. */
  const ordered = () => latest.current.g.albums.map((x) => latest.current.albums.find((a) => a.id === x)).filter((a): a is Album => !!a);

  const chooseDestination = useCallback((count: number) => chooseAlbum(ordered(), `Where should ${count === 1 ? 'this photo' : `these ${count} photos`} go?`, true), []);

  const onDropTarget = useCallback((i: number, target: HTMLElement) => {
    const id = target.dataset.albumId;
    if (id) moveToAlbum(i, id);
  }, [moveToAlbum]);

  const onMoveOut = useCallback(
    async (i: number) => {
      const id = await chooseAlbum(ordered(), 'Move to which album?');
      if (id) moveToAlbum(i, id);
    },
    [moveToAlbum],
  );

  // Dragging albums to reorder them.
  const albumGrid = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!albumGrid.current) return;
    return sortable({
      container: albumGrid.current,
      items: '.pg-item',
      handle: '.ed-grip',
      grid: true,
      onMove: (from, to) => emit({ ...latest.current.g, albums: moveItem([...latest.current.g.albums], from, to) }, latest.current.albums),
    });
  }, [emit]);

  return (
    <div className="ed-fields">
      <section className="ed-field">
        <span className="lab">Single photos</span>
        <PhotoGrid
          photos={g.gallery}
          onChange={setPhotos}
          ctx={ctx}
          folder="gallery"
          make={(photo) => ({ picture: 'sea', photo, caption: '' })}
          emptyText="No single photos yet."
          dropTargets={g.albums.length ? '.album-target' : undefined}
          onDropTarget={onDropTarget}
          onMoveOut={g.albums.length ? onMoveOut : undefined}
          chooseDestination={g.albums.length ? chooseDestination : undefined}
          onAddToAlbum={addToAlbum}
        />
      </section>

      <section className="ed-field">
        <div className="ed-list-head">
          <span className="lab">Albums</span>
          <a href="#/albums/new" className="ed-btn solid">
            <Icon name="plus" size={16} /> New album
          </a>
        </div>
        <span className="ed-hint">Each album is its own page, like a short travel post. Drag to set their order; ★ features one at the top of the Gallery. Drag a single photo above onto an album to move it in.</span>
        {g.albums.length === 0 ? (
          <p className="pg-empty soft">No albums yet. Make one for a trip or a theme.</p>
        ) : (
          <ol className="pg-grid albums" ref={albumGrid}>
            {g.albums.map((id, i) => {
              const a = byId.get(id);
              if (!a) return null;
              return (
                <li className="pg-item album-target" key={id} data-album-id={id}>
                  <div className="pg-thumb">
                    <a href={`#/albums/${encodeURIComponent(id)}`} aria-label={`Edit album ${a.title || id}`} className="pg-thumb-link">
                      <Thumb photo={coverOf(a)} />
                    </a>
                    <button
                      type="button"
                      className={`pg-star${g.featured === id ? ' on' : ''}`}
                      aria-pressed={g.featured === id}
                      aria-label={g.featured === id ? `${a.title} is featured. Click to stop featuring it.` : `Feature ${a.title} at the top of the Gallery`}
                      title={g.featured === id ? 'Featured at the top of the Gallery' : 'Feature at the top of the Gallery'}
                      onClick={() => emit({ ...latest.current.g, featured: latest.current.g.featured === id ? '' : id }, latest.current.albums)}
                    >
                      <Icon name="star" size={16} />
                    </button>
                  </div>
                  <div className="pg-row">
                    <button type="button" className="ed-icon ed-grip" aria-label={`Album ${i + 1}, ${a.title}. Drag, or use the arrow keys, to reorder.`} title="Drag to reorder">
                      <Icon name="grip" />
                    </button>
                    <a className="pg-album-title" href={`#/albums/${encodeURIComponent(id)}`}>
                      <span>{a.title || id}</span>
                      <span className="soft">
                        {[a.location, `${a.photos.length} photo${a.photos.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                        {g.featured === id ? ' · Featured' : ''}
                        {a.draft ? ' · Draft' : ''}
                        {changed.current.has(id) ? ' · unsaved' : ''}
                      </span>
                    </a>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="ed-field">
        <span className="lab">Drawings</span>
        <span className="ed-hint">Shown in their own section under the photos on the Gallery page. Upload scans or pictures of your drawings.</span>
        <PhotoGrid
          photos={g.drawings || []}
          onChange={setDrawings}
          ctx={ctx}
          folder="drawings"
          make={(photo) => ({ picture: 'sea', photo, caption: '' })}
          emptyText="No drawings yet."
          addLabel="Add drawings"
        />
      </section>
    </div>
  );
}

/**
 * A small chooser listing the albums. Resolves with the chosen album's id; with `singles`, there's
 * also a "Single photos" choice, which resolves null. Cancel resolves undefined.
 */
function chooseAlbum(albums: Album[], title: string, singles = false): Promise<string | null | undefined> {
  return dialog<string | null | undefined>(undefined, (close) => {
    const choices = albums.map((a) => {
      const img = el('img', { alt: '' });
      const cover = coverOf(a);
      if (cover) showImage(img, cover);
      return el(
        'button',
        { type: 'button', cls: 'pick-album', on: { click: () => close(a.id) } },
        el('span', { cls: 'pick' }, img),
        el('span', {}, a.title || a.id, el('span', { cls: 'soft' }, ` · ${plural(a.photos.length, 'photo')}`)),
      );
    });
    return [
      el('h2', { cls: 'ed-dialog-title' }, title),
      el('div', { cls: 'pick-grid' }, ...choices),
      el('div', { cls: 'ed-actions' }, button('Cancel', () => close(undefined), 'ed-btn quiet'), singles ? button('Single photos', () => close(null), 'ed-btn solid') : null),
    ];
  }, 'ed-dialog wide');
}
