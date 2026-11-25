// React version of Pic.astro: an uploaded photo, or one of the built-in drawings.
import { useId } from 'react';
import { scene } from '../../lib/scene';
import { url, isImage } from '../../lib/url';

export type Pictured = { picture: string; caption?: string };

export function Picture({ picture = 'sea', alt = '', eager = false }: { picture?: string; alt?: string; eager?: boolean }) {
  // useId is the same on the server and in the browser, so the drawing's ids stay stable and unique.
  const id = 'r' + useId().replace(/[^a-zA-Z0-9]/g, '');
  if (isImage(picture)) {
    return <img src={url(picture)} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
  }
  // The drawing is our own generated SVG (never text from visitors), so inserting it as HTML is safe.
  return (
    <span
      className="pic-svg"
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      dangerouslySetInnerHTML={{ __html: scene(picture, id) }}
    />
  );
}
