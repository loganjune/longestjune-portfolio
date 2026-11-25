// Photo "looks": brightness, contrast, saturation, warmth, tint, fade, vignette and black-and-white,
// a set of ready-made filters, and frames. Applied to the pixels directly so it behaves the same in
// every browser.

export type Look = { brightness: number; contrast: number; saturation: number; warmth: number; tint: number; fade: number; vignette: number; bw: boolean };

export const PLAIN: Look = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, tint: 0, fade: 0, vignette: 0, bw: false };

/** One-tap filters. Each is just a set of slider positions, so you can fine-tune after picking one. */
export const FILTERS: { name: string; look: Look }[] = [
  { name: 'Original', look: PLAIN },
  { name: 'Mono', look: { ...PLAIN, bw: true, contrast: 10 } },
  { name: 'Noir', look: { ...PLAIN, bw: true, contrast: 35, brightness: -6, vignette: 30 } },
  { name: 'Sepia', look: { ...PLAIN, bw: true, warmth: 38, contrast: 6, fade: 10 } },
  { name: 'Cyanotype', look: { ...PLAIN, bw: true, warmth: -42, contrast: 10 } },
  { name: 'Warm', look: { ...PLAIN, warmth: 28, saturation: 8 } },
  { name: 'Cool', look: { ...PLAIN, warmth: -24, saturation: -5 } },
  { name: 'Golden', look: { ...PLAIN, warmth: 34, brightness: 6, saturation: 12, contrast: 6 } },
  { name: 'Rosé', look: { ...PLAIN, tint: 22, warmth: 10, fade: 16, brightness: 6 } },
  { name: 'Pastel', look: { ...PLAIN, brightness: 12, contrast: -18, saturation: -10, fade: 22, tint: 8 } },
  { name: 'Summer', look: { ...PLAIN, brightness: 8, warmth: 16, fade: 12, saturation: 10 } },
  { name: 'Vivid', look: { ...PLAIN, saturation: 35, contrast: 14 } },
  { name: 'Faded', look: { ...PLAIN, fade: 35, contrast: -12, saturation: -18 } },
  { name: 'Film', look: { ...PLAIN, contrast: 12, saturation: -12, warmth: 10, fade: 18, vignette: 25 } },
  { name: 'Matte', look: { ...PLAIN, fade: 45, contrast: -20, saturation: -8 } },
  { name: 'Dusk', look: { ...PLAIN, tint: 14, warmth: -10, brightness: -6, saturation: 6, vignette: 30 } },
  { name: 'Moody', look: { ...PLAIN, brightness: -10, contrast: 22, saturation: -25, vignette: 45 } },
];

export const isPlain = (l: Look) => !l.bw && !l.brightness && !l.contrast && !l.saturation && !l.warmth && !l.tint && !l.fade && !l.vignette;

/** Applies a look to a canvas, in place. Each slider runs from −100 to 100 (fade and vignette from 0 to 100). */
export function applyLook(canvas: HTMLCanvasElement, l: Look): void {
  if (isPlain(l)) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const { width: W, height: H } = canvas;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const bright = l.brightness / 250; // added to each channel
  const con = 1 + l.contrast / 100; // spread around mid-grey
  const sat = l.bw ? 0 : 1 + l.saturation / 100; // 0 = grey, 1 = as is, 2 = twice as colourful
  // Warmth and tint come after the colour is set, so black and white can be toned (sepia, cyanotype).
  const warm = l.warmth / 400; // red up, blue down (or the reverse)
  const tint = l.tint / 400; // magenta (green down) or green
  const fade = (l.fade / 100) * 0.3; // lifts the darks towards a soft, washed-out light
  const lift = fade * 0.85;
  const vig = (l.vignette / 100) * 0.65; // darkens the corners
  const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let r = d[i] / 255 + bright;
    let g = d[i + 1] / 255 + bright;
    let b = d[i + 2] / 255 + bright;
    r = (r - 0.5) * con + 0.5;
    g = (g - 0.5) * con + 0.5;
    b = (b - 0.5) * con + 0.5;
    const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = grey + (r - grey) * sat + warm + tint / 2;
    g = grey + (g - grey) * sat - tint;
    b = grey + (b - grey) * sat - warm + tint / 2;
    if (fade) {
      r = r * (1 - fade) + lift;
      g = g * (1 - fade) + lift;
      b = b * (1 - fade) + lift;
    }
    if (vig) {
      const dx = (p % W) / W - 0.5;
      const dy = Math.floor(p / W) / H - 0.5;
      const t = Math.min(1, Math.max(0, (Math.sqrt(dx * dx + dy * dy) / 0.7071 - 0.4) / 0.6));
      const k = 1 - vig * t * t * (3 - 2 * t); // smooth fall-off from the middle
      r *= k;
      g *= k;
      b *= k;
    }
    d[i] = clamp(r) * 255;
    d[i + 1] = clamp(g) * 255;
    d[i + 2] = clamp(b) * 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** A border added around the photo. Widths are fractions of the photo's shorter side. */
export type Frame = { name: string; color: string; side: number; bottom: number };

export const FRAMES: Frame[] = [
  { name: 'None', color: '', side: 0, bottom: 0 },
  { name: 'Thin white', color: '#ffffff', side: 0.02, bottom: 0.02 },
  { name: 'White', color: '#ffffff', side: 0.06, bottom: 0.06 },
  { name: 'Polaroid', color: '#fbf8f3', side: 0.05, bottom: 0.2 },
  { name: 'Sand', color: '#f3e6dc', side: 0.07, bottom: 0.07 },
  { name: 'Ink', color: '#3a2c27', side: 0.015, bottom: 0.015 },
];

/** Frame widths in pixels for a photo of this size. */
export function frameSize(f: Frame, w: number, h: number) {
  const short = Math.min(w, h);
  return { side: Math.round(f.side * short), bottom: Math.round(f.bottom * short) };
}

/** Returns a new canvas with the photo inside the frame (or the same canvas for no frame). */
export function addFrame(canvas: HTMLCanvasElement, f: Frame): HTMLCanvasElement {
  if (!f.side) return canvas;
  const { side, bottom } = frameSize(f, canvas.width, canvas.height);
  const out = document.createElement('canvas');
  out.width = canvas.width + side * 2;
  out.height = canvas.height + side + bottom;
  const x = out.getContext('2d')!;
  x.fillStyle = f.color;
  x.fillRect(0, 0, out.width, out.height);
  x.drawImage(canvas, side, side);
  return out;
}
