// Photos: shrink and convert on the device before uploading, and show previews of photos
// that are saved in drafts but not live yet.
import type { GitHub } from './github';

const MAX = 2400; // longest side, in pixels
const QUALITY = 0.85;

export type Prepared = { bytes: Uint8Array; ext: 'webp' | 'jpg'; previewUrl: string };

/** What the photo pickers accept: any image, plus iPhone HEIC files (which some browsers don't label as images). */
export const PHOTO_ACCEPT = 'image/*,.heic,.heif';
/** Is this file a photo we can use? */
export const isPhotoFile = (f: File) => f.type.startsWith('image/') || /\.hei[cf]$/i.test(f.name);

const isHeicFile = (f: Blob & { name?: string }) => /image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name || '');

/**
 * Opens a photo as pixels, turned the right way up. iPhone HEIC photos open directly in Safari;
 * other browsers convert them with heic-to, which is only downloaded the first time it's needed.
 */
export async function decodePhoto(file: Blob & { name?: string }): Promise<ImageBitmap> {
  const name = file.name || 'This photo';
  if (!isHeicFile(file) && file.type && !file.type.startsWith('image/')) throw new Error(`${name} isn’t a photo.`);
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    if (!isHeicFile(file)) throw new Error(`Couldn’t open ${name}. Try a JPEG, PNG or HEIC photo.`);
  }
  try {
    const { heicTo } = await import('heic-to');
    return await heicTo({ blob: file, type: 'bitmap' });
  } catch {
    throw new Error(`Couldn’t open ${name}. It may not be a photo, or it may be damaged.`);
  }
}

/** Draws a picture into a canvas no larger than MAX on its longest side. */
export function fitCanvas(source: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const scale = Math.min(1, MAX / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Saves a canvas as WebP (JPEG if this browser can't make WebP). Camera data is never included. */
export async function encodeCanvas(canvas: HTMLCanvasElement): Promise<Prepared> {
  let blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', QUALITY));
  let ext: 'webp' | 'jpg' = 'webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', QUALITY));
    ext = 'jpg';
  }
  if (!blob) throw new Error('Couldn’t convert the photo.');
  return { bytes: new Uint8Array(await blob.arrayBuffer()), ext, previewUrl: URL.createObjectURL(blob) };
}

/** Resizes a photo (keeping its rotation), strips camera data, and converts it to WebP. Works with HEIC too. */
export async function preparePhoto(file: File): Promise<Prepared> {
  const bitmap = await decodePhoto(file);
  const canvas = fitCanvas(bitmap, bitmap.width, bitmap.height);
  bitmap.close();
  return encodeCanvas(canvas);
}

/** A tidy, unique file name, e.g. "2026-11-morning-swim-k3f9.webp". */
export function photoName(original: string, ext: string): string {
  const base =
    original
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'photo';
  const month = new Date().toISOString().slice(0, 7);
  return `${month}-${base}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
}

// Site path (/images/x.webp) -> preview URL, for photos uploaded in this session or fetched from drafts.
const previews = new Map<string, string>();
let gh: GitHub | null = null;

export function setPreviewSource(github: GitHub) {
  gh = github;
}

export function rememberPreview(sitePath: string, url: string) {
  previews.set(sitePath, url);
}

/** The file behind a photo already in the editor (uploaded now, saved in drafts, or live), for editing it. */
export async function photoBlob(sitePath: string): Promise<Blob> {
  const known = previews.get(sitePath);
  if (known) return (await fetch(known)).blob();
  const live = await fetch(sitePath).catch(() => null);
  if (live?.ok && live.headers.get('content-type')?.startsWith('image/')) return live.blob();
  if (!gh) throw new Error('Couldn’t load the photo.');
  return new Blob([await gh.readBytes(`public${sitePath}`)]);
}

/**
 * Shows a site image in an <img>. Published photos load straight from the site; photos that only
 * exist in drafts are fetched from GitHub instead.
 */
export function showImage(img: HTMLImageElement, sitePath: string) {
  const known = previews.get(sitePath);
  if (known) {
    img.src = known;
    return;
  }
  img.src = sitePath;
  img.onerror = async () => {
    img.onerror = null;
    if (!gh || !sitePath.startsWith('/images/')) return;
    try {
      const buf = await gh.readBytes(`public${sitePath}`);
      const url = URL.createObjectURL(new Blob([buf]));
      previews.set(sitePath, url);
      img.src = url;
    } catch {
      img.alt = 'Photo not found';
    }
  };
}
