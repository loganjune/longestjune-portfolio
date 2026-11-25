// A grid of photos that open large in a viewer. Used on the Gallery page and on album pages.
// Swipe, the arrow keys or the round buttons move between photos; Escape or the close button closes.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Picture } from './Picture';
import { url, isImage } from '../../lib/url';

type Photo = { picture: string; caption: string };

const icon = (d: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const PREV = icon(<path d="M15 6l-6 6 6 6" />);
const NEXT = icon(<path d="M9 6l6 6-6 6" />);
const CLOSE = icon(<path d="M6 6l12 12M18 6L6 18" />);

// Photo-book rhythm: a pair, one set left, one set right, one wide, then repeat. It starts with a pair
// because the page above already shows one big photo (the cover).
const BOOK = ['pair', 'pair', 'left', 'right', 'wide'];

type Props = { photos: Photo[]; label?: string; layout?: 'grid' | 'book' };

export default function PhotoGallery({ photos, label = 'Photos', layout = 'grid' }: Props) {
  const book = layout === 'book';
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const n = photos.length;

  const go = useCallback((by: number) => setOpen((i) => (i === null ? i : (i + by + n) % n)), [n]);

  // Open and close the native dialog (it handles Escape, focus and blocking the page behind).
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, go]);

  // Load the neighbouring photos early so moving between them feels instant.
  useEffect(() => {
    if (open === null) return;
    for (const j of [open - 1, open + 1]) {
      const p = photos[(j + n) % n]?.picture;
      if (p && isImage(p)) new Image().src = url(p);
    }
  }, [open, photos, n]);

  const onPointerDown = (e: ReactPointerEvent) => (swipe.current = { x: e.clientX, y: e.clientY });
  const onPointerUp = (e: ReactPointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? 1 : -1);
  };

  const current = open === null ? null : photos[open];

  return (
    <>
      <div className={book ? 'book' : 'cards three scatter'}>
        {photos.map((p, i) => (
          <figure
            key={i}
            className={book ? `photo bk bk-${BOOK[i % BOOK.length]}` : `card photo${i % 3 === 1 ? ' tall' : ''}`}
            style={{ margin: 0 }}
          >
            <button
              type="button"
              className={book ? 'bk-pic photo-open' : 'ph fill photo-open'}
              aria-label={`Open photo ${i + 1} of ${n}${p.caption ? `: ${p.caption}` : ''}`}
              onClick={(e) => {
                opener.current = e.currentTarget;
                setOpen(i);
              }}
            >
              <Picture picture={p.picture} alt={p.caption} />
            </button>
            {p.caption && (
              // Over the photo on hover with a mouse; small and always visible underneath on phones.
              <figcaption className="photo-cap">{p.caption}</figcaption>
            )}
          </figure>
        ))}
      </div>

      <dialog
        ref={dialog}
        className="viewer"
        aria-label={label}
        onClose={() => {
          setOpen(null);
          opener.current?.focus();
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {current && open !== null && (
          <>
            <div className="viewer-top g">
              <span className="lab soft" aria-live="polite">
                {open + 1} / {n}
              </span>
              <button type="button" className="round" aria-label="Close" onClick={() => setOpen(null)}>
                {CLOSE}
              </button>
            </div>
            <figure className="viewer-fig g">
              <div className="viewer-pic" key={open}>
                <Picture picture={current.picture} alt={current.caption} eager />
              </div>
              <figcaption className="viewer-cap">{current.caption}</figcaption>
            </figure>
            {n > 1 && (
              <>
                <button type="button" className="round viewer-nav prev" aria-label="Previous photo" onClick={() => go(-1)}>
                  {PREV}
                </button>
                <button type="button" className="round viewer-nav next" aria-label="Next photo" onClick={() => go(1)}>
                  {NEXT}
                </button>
              </>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
