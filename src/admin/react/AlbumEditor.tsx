// The editor's album screen: details, photos (drag to reorder, captions, cover star) and the
// travel story, written like a blog post with photos placed inside the text.
import { useCallback, useEffect, useRef, useState } from 'react';
import PhotoGrid from './PhotoGrid';
import TagsField, { ALBUM_TAGS } from './TagsField';
import { richText } from '../richtext';
import { addPhoto, type Ctx } from '../forms';
import { el, button, toast, dialog } from '../ui';
import { showImage, PHOTO_ACCEPT } from '../images';
import type { Album, Photo } from '../albums';

type Props = { album: Album; ctx: Ctx; onChange: (a: Album) => void; registerStory: (get: () => string) => void };

export default function AlbumEditor({ album: initial, ctx, onChange, registerStory }: Props) {
  const [a, setA] = useState<Album>(initial);
  const latest = useRef(a);
  latest.current = a;

  const update = useCallback(
    (patch: Partial<Album>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setA(next);
      onChange(next);
    },
    [onChange],
  );
  const setPhotos = useCallback((photos: Photo[]) => update({ photos }), [update]);

  // The story editor (TipTap) is plain JavaScript, mounted once into this element.
  const storyHost = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!storyHost.current) return;
    const story = richText(initial.body, ctx, 'albums', 'Travel story', 'Write about the trip… Use the photo button to place photos in the story.', () =>
      pickPhoto(latest.current.photos, ctx),
    );
    storyHost.current.replaceChildren(story.element);
    registerStory(story.getMarkdown);
    return story.destroy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ed-note">
      <input className="ed-title-input" value={a.title} placeholder="Album title" aria-label="Album title" onChange={(e) => update({ title: e.target.value })} />
      <div className="ed-note-meta album">
        <label className="ed-field">
          <span className="lab">Location</span>
          <input value={a.location} placeholder="Lisbon, Portugal" onChange={(e) => update({ location: e.target.value })} />
        </label>
        <label className="ed-field">
          <span className="lab">Date</span>
          <input type="date" value={a.date} onChange={(e) => update({ date: e.target.value })} />
        </label>
        <label className="ed-check">
          <input type="checkbox" checked={a.draft} onChange={(e) => update({ draft: e.target.checked })} />
          <span>
            <span className="lab">Draft</span>
            <span className="ed-hint">Hidden from the live site</span>
          </span>
        </label>
      </div>
      <label className="ed-field">
        <span className="lab">Short description</span>
        <textarea rows={2} value={a.description} placeholder="A line or two, shown under the title and on the Gallery page." onChange={(e) => update({ description: e.target.value })} />
      </label>
      <TagsField tags={a.tags} onChange={(tags) => update({ tags })} suggestions={ALBUM_TAGS} hint="Used to filter albums on the Gallery page. An album with a travel story also shows on Stories under these tags." />
      <label className="ed-check feature">
        <input type="checkbox" checked={a.featured} onChange={(e) => update({ featured: e.target.checked })} />
        <span>
          <span className="lab">Feature at the top of the Gallery</span>
          <span className="ed-hint">Shown large above the other albums. Only one album is featured at a time, so this replaces the current one.</span>
        </span>
      </label>

      <section className="ed-field">
        <span className="lab">Photos</span>
        <PhotoGrid
          photos={a.photos}
          onChange={setPhotos}
          ctx={ctx}
          folder="albums"
          make={(photo) => ({ photo, caption: '' })}
          cover={a.cover}
          onCover={(photo) => update({ cover: photo })}
          emptyText="No photos yet. Add some, then star the one you want as the cover."
        />
      </section>

      <section className="ed-field">
        <span className="lab">Travel story</span>
        <span className="ed-hint">Optional. Written like a blog post: the album page shows it first, with any photos you place in it, and the full grid of photos after.</span>
        <div ref={storyHost} />
      </section>
    </div>
  );
}

/** A small chooser: one of the album's photos, or a new upload. */
function pickPhoto(photos: Photo[], ctx: Ctx): Promise<{ src: string; alt: string } | null> {
  return dialog<{ src: string; alt: string } | null>(null, (close) => {
    const input = el('input', { type: 'file', accept: PHOTO_ACCEPT, cls: 'ed-file' });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        close({ src: await addPhoto(file, 'albums', ctx), alt: '' });
      } catch (e) {
        close(null);
        toast((e as Error).message, 'error');
      }
    });
    const choices = photos
      .filter((p) => p.photo)
      .map((p) => {
        const img = el('img', { alt: '' });
        showImage(img, p.photo);
        return el('button', { type: 'button', cls: 'pick', title: p.caption || 'Photo', on: { click: () => close({ src: p.photo, alt: p.caption }) } }, img);
      });
    return [
      el('h2', { cls: 'ed-dialog-title' }, 'Add a photo to the story'),
      choices.length ? el('div', { cls: 'pick-grid' }, ...choices) : el('p', { cls: 'soft' }, 'This album has no photos yet.'),
      el('div', { cls: 'ed-actions' }, button('Cancel', () => close(null), 'ed-btn quiet'), el('label', { cls: 'ed-btn solid' }, 'Upload a new photo', input)),
    ];
  }, 'ed-dialog wide');
}
