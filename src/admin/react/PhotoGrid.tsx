// A grid of photo thumbnails for the editor: drag to reorder, caption under each photo,
// optional cover star, remove. Add photos with the button or by dropping files onto the grid.
import { useEffect, useId, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { sortable, moveItem } from '../sortable';
import { addPhoto, addPhotoEdited, editPhoto, editDrawing, type Ctx } from '../forms';
import { showImage, PHOTO_ACCEPT, isPhotoFile } from '../images';
import { scene } from '../../lib/scene';
import { toast, confirmBox, chooseBox } from '../ui';
import type { Photo } from '../albums';
import { Icon } from './Icon';

/** A thumbnail: an uploaded photo (even one only saved in drafts) or a built-in drawing. */
export function Thumb({ photo, picture }: { photo?: string; picture?: string }) {
  const img = useRef<HTMLImageElement>(null);
  const id = 't' + useId().replace(/[^a-zA-Z0-9]/g, '');
  useEffect(() => {
    if (photo && img.current) showImage(img.current, photo);
  }, [photo]);
  if (photo) return <img ref={img} alt="" />;
  // Built-in drawings are our own SVG, never user input.
  return <span className="pic-svg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: scene(picture || 'sea', id) }} />;
}

type Props = {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  ctx: Ctx;
  /** Uploads go to public/images/<folder>/. */
  folder: string;
  /** Builds a new entry for an uploaded photo. */
  make: (photo: string) => Photo;
  /** When given, each photo gets a star to make it the cover. */
  cover?: string;
  onCover?: (photo: string) => void;
  emptyText: string;
  /** Album cards (elsewhere on the screen) a photo can be dragged onto. */
  dropTargets?: string;
  onDropTarget?: (index: number, target: HTMLElement) => void;
  /** When given, each photo gets a "Move to album" button. */
  onMoveOut?: (index: number) => void;
  /**
   * When given, adding photos first asks where they go. Resolves with an album id, null for this
   * grid, or undefined if cancelled. Photos for an album go to onAddToAlbum instead of this grid.
   */
  chooseDestination?: (count: number) => Promise<string | null | undefined>;
  onAddToAlbum?: (photos: string[], albumId: string) => void;
  /** The upload button's text (default "Add photos"). */
  addLabel?: string;
};

export default function PhotoGrid({ photos, onChange, ctx, folder, make, cover, onCover, emptyText, dropTargets, onDropTarget, onMoveOut, chooseDestination, onAddToAlbum, addLabel = 'Add photos' }: Props) {
  const grid = useRef<HTMLOListElement>(null);
  const latest = useRef(photos);
  latest.current = photos;
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);

  // Drag and drop reordering (and arrow keys on the grip).
  useEffect(() => {
    if (!grid.current) return;
    return sortable({
      container: grid.current,
      items: '.pg-item',
      handle: '.ed-grip',
      grid: true,
      onMove: (from, to) => onChange(moveItem([...latest.current], from, to)),
      dropTargets,
      onDropTarget,
    });
  }, [onChange, dropTargets, onDropTarget]);

  const edit = async (i: number) => {
    const p = latest.current[i];
    if (!p) return;
    try {
      // A built-in drawing opens in the editor too; once saved it's an ordinary photo.
      const path = p.photo ? await editPhoto(p.photo, folder, ctx) : await editDrawing(p.picture || 'sea', folder, ctx);
      if (!path) return;
      const how = await chooseBox('Save the edited photo', 'Replace the original, or keep it and add the edited version as a new photo next to it?', [
        { label: 'Save as new photo', value: 'new' },
        { label: 'Replace photo', value: 'replace' },
      ]);
      if (!how) {
        ctx.uploads.delete(`public${path}`);
        return;
      }
      const list = latest.current;
      onChange(how === 'replace' ? list.map((x, j) => (j === i ? { ...x, photo: path } : x)) : [...list.slice(0, i + 1), { ...list[i], photo: path }, ...list.slice(i + 1)]);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const upload = async (files: File[]) => {
    const images = files.filter(isPhotoFile);
    if (!images.length) return;
    const dest = chooseDestination ? await chooseDestination(images.length) : null;
    if (dest === undefined) return;
    setBusy((n) => n + images.length);
    const forAlbum: string[] = [];
    for (const file of images) {
      try {
        // A single photo opens the photo editor first; several at once are added straight away.
        const path = images.length === 1 ? await addPhotoEdited(file, dest ? 'albums' : folder, ctx) : await addPhoto(file, dest ? 'albums' : folder, ctx);
        if (!path) continue;
        if (dest) forAlbum.push(path);
        else onChange([...latest.current, make(path)]);
      } catch (e) {
        toast((e as Error).message, 'error');
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (dest && forAlbum.length) onAddToAlbum?.(forAlbum, dest);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    upload([...e.dataTransfer.files]);
  };

  const set = (i: number, patch: Partial<Photo>) => onChange(latest.current.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const currentCover = cover || photos.find((p) => p.photo)?.photo || '';

  return (
    <div
      className={`pg${over ? ' over' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <div className="pg-tools">
        <label className="ed-btn solid">
          <Icon name="photo" size={16} /> {addLabel}
          <input
            type="file"
            accept={PHOTO_ACCEPT}
            multiple
            className="ed-file"
            onChange={(e) => {
              const files = [...(e.target.files || [])];
              e.target.value = '';
              upload(files);
            }}
          />
        </label>
        <span className="ed-hint">{busy ? `Preparing ${busy} photo${busy > 1 ? 's' : ''}…` : 'or drop photos here. Drag the grip to reorder; the sliders button edits a photo.'}</span>
      </div>
      {photos.length === 0 ? (
        <p className="pg-empty soft">{emptyText}</p>
      ) : (
        <ol className="pg-grid" ref={grid}>
          {photos.map((p, i) => {
            const isCover = !!onCover && !!p.photo && p.photo === currentCover;
            return (
              <li className="pg-item" key={`${p.photo || p.picture}-${i}`}>
                <div className="pg-thumb">
                  <Thumb photo={p.photo} picture={p.picture} />
                  {onCover && p.photo && (
                    <button
                      type="button"
                      className={`pg-star${isCover ? ' on' : ''}`}
                      aria-pressed={isCover}
                      aria-label={isCover ? 'This is the cover' : 'Use as cover'}
                      title={isCover ? 'Cover photo' : 'Use as cover'}
                      onClick={() => onCover(p.photo)}
                    >
                      <Icon name="star" size={16} />
                    </button>
                  )}
                </div>
                <div className="pg-row">
                  <button type="button" className="ed-icon ed-grip" aria-label={`Photo ${i + 1}. Drag, or use the arrow keys, to reorder.`} title="Drag to reorder">
                    <Icon name="grip" />
                  </button>
                  <input
                    className="pg-caption"
                    value={p.caption}
                    placeholder="Caption"
                    aria-label={`Caption for photo ${i + 1}`}
                    onChange={(e) => set(i, { caption: e.target.value })}
                  />
                  {(p.photo || p.picture) && (
                    <button type="button" className="ed-icon" aria-label={`Edit photo ${i + 1}: crop, rotate, filters`} title="Edit photo" onClick={() => edit(i)}>
                      <Icon name="adjust" />
                    </button>
                  )}
                  {onMoveOut && p.photo && (
                    <button type="button" className="ed-icon" aria-label={`Move photo ${i + 1} to an album`} title="Move to album" onClick={() => onMoveOut(i)}>
                      <Icon name="move" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="ed-icon"
                    aria-label={`Remove photo ${i + 1}`}
                    title="Remove"
                    onClick={async () => {
                      if (!(await confirmBox('Remove this photo?', `${p.caption ? `“${p.caption}” will` : 'It will'} be taken out when you save. Until you publish, you can still discard the change.`, 'Remove', true))) return;
                      onChange(latest.current.filter((_, j) => j !== i));
                    }}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
