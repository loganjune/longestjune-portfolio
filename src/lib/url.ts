/** Builds a link that works under the site's base path (currently the domain root, `/`). */
export function url(path = ''): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return p ? `${base}/${p}` : `${base}/`;
}

/** True when a `picture` value points at an image file rather than a built-in drawing. */
export function isImage(p = ''): boolean {
  return /^(https?:|\/|\.\/|images\/)|\.(jpe?g|png|webp|gif|avif|svg)$/i.test(p);
}

/** "Nov 12, 2026" */
export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export const PAGES = [
  { href: '', name: 'Home', jp: 'ホーム' },
  { href: 'about', name: 'About', jp: '自己紹介' },
  { href: 'projects', name: 'Projects', jp: '制作' },
  { href: 'stories', name: 'Stories', jp: '記録' },
  { href: 'gallery', name: 'Gallery', jp: '写真' },
  { href: 'resume', name: 'Resume', jp: '経歴' },
  { href: 'shop', name: 'Shop', jp: 'ショップ' },
  { href: 'contact', name: 'Contact', jp: '連絡' },
];
