// Homepage featured projects: a photo with graphics drawn over it ("half photo, half drawing").
// Each overlay is drawn in its photo's own pixels, so it stays lined up with the horizon, the water
// and so on at any screen size. If a project's photo changes in the editor, its overlay switches off
// (it would no longer line up) and the plain photo shows instead.
// Colours come from the built-in drawings (src/lib/scene.ts).
import { url } from './url';

type Art = {
  photo: string; // the photo it was drawn for
  w: number; // photo size in pixels
  h: number;
  view: [number, number]; // the band of the photo to centre on (top, height)
  band?: string; // a colour band across the top, as tall as the title, so the title sits on it
  defs: string;
  art: string;
};

/** Repeats a template n times. */
const times = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i)).join('');

const ART: Record<string, Art> = {
  // Solstice: a sunset drawn onto the real horizon (y 708; the photo was levelled by 3.5° to make it flat).
  solstice: {
    photo: '/images/gallery/2026-11-shoreline.webp',
    w: 1800,
    h: 2400,
    view: [120, 1360],
    defs: `<radialGradient id="ov-glow"><stop offset="0" stop-color="#fff6ee" stop-opacity=".95"/><stop offset=".3" stop-color="#f6c9cf" stop-opacity=".6"/><stop offset="1" stop-color="#f2b8c2" stop-opacity="0"/></radialGradient>
      <linearGradient id="ov-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8db6d6" stop-opacity=".15"/><stop offset=".55" stop-color="#cdbfd6" stop-opacity=".45"/><stop offset="1" stop-color="#f4d8d6" stop-opacity=".8"/></linearGradient>
      <clipPath id="ov-above"><rect width="1800" height="708"/></clipPath>`,
    art: `<g clip-path="url(#ov-above)"><rect width="1800" height="708" fill="url(#ov-sky)"/>
      <circle cx="900" cy="708" r="560" fill="url(#ov-glow)"/>
      <circle cx="900" cy="708" r="250" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/>
      <circle cx="900" cy="708" r="340" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
      <circle cx="900" cy="708" r="165" fill="#fff6ee"/></g>
      <path d="M0 708H1800" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>
      <g>
        <ellipse cx="900" cy="763" rx="520" ry="110" fill="url(#ov-glow)" opacity=".55"/>
        ${times(16, (i) => {
          const w = 280 - i * 15;
          return `<rect x="${900 - w / 2}" y="${727 + i * 26}" width="${w}" height="${6 + i * 0.5}" rx="3" fill="#fde9e2" opacity="${(0.9 - i * 0.045).toFixed(2)}"/>`;
        })}
        ${times(34, (i) => `<rect x="${(i * 211) % 1800}" y="${738 + ((i * 83) % 330)}" width="${50 + ((i * 37) % 90)}" height="3" fill="#eef5fa" opacity=".5"/>`)}
      </g>`,
  },

  // Pool Tile: a tile grid, wave lines, a lane rope and a pool ring; the pink coping from the drawing is
  // the title band (drawn by the page, so it always matches the title's height).
  'pool-tile': {
    photo: '/images/gallery/2026-11-pool-water.webp',
    w: 1800,
    h: 1000,
    view: [0, 1000],
    band: '#f4dfe1',
    defs: `<pattern id="ov-tile" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M90 0H0V90" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="2"/></pattern>`,
    art: `<rect width="1800" height="1000" fill="url(#ov-tile)"/>
      ${times(7, (i) => `<path d="M0 ${200 + i * 112}${times(12, () => 'q75 -20 150 0')}" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="4"/>`)}
      ${times(50, (i) => `<circle cx="${18 + i * 36}" cy="720" r="11" fill="${i % 2 ? '#fff' : '#f2b8c2'}" opacity=".9"/>`)}
      <ellipse cx="1020" cy="560" rx="150" ry="40" fill="#36506d" opacity=".18"/>
      <circle cx="1000" cy="510" r="92" fill="none" stroke="#f2b8c2" stroke-width="58"/>
      <circle cx="1000" cy="510" r="92" fill="none" stroke="#fff" stroke-width="58" stroke-dasharray="72.3 72.3"/>
      <circle cx="1000" cy="510" r="121" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>`,
  },

  // Window Light: the plane-window view framed by a drawn cabin window (bezel, shade half up, a slant of
  // light), with the rest of the photo softly tinted so the white title stays readable.
  'window-light': {
    photo: '/images/gallery/2026-11-window-seat.webp',
    w: 1800,
    h: 2400,
    view: [420, 1360],
    defs: `<clipPath id="ov-pane"><rect x="540" y="560" width="720" height="1060" rx="300"/></clipPath>
      <linearGradient id="ov-tint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6c7cf" stop-opacity=".2"/><stop offset="1" stop-color="#f3e6dc" stop-opacity=".45"/></linearGradient>`,
    art: `<g transform="translate(900 1090) scale(.78) translate(-900 -1090)"><path fill-rule="evenodd" fill="url(#ov-tint)" d="M-1200 -1200H3000V3600H-1200Z M840 560H960A300 300 0 0 1 1260 860V1320A300 300 0 0 1 960 1620H840A300 300 0 0 1 540 1320V860A300 300 0 0 1 840 560Z"/>
      <path fill-rule="evenodd" fill="#efe3da" opacity=".95" d="M840 420H960A440 440 0 0 1 1400 860V1320A440 440 0 0 1 960 1760H840A440 440 0 0 1 400 1320V860A440 440 0 0 1 840 420Z M840 560H960A300 300 0 0 1 1260 860V1320A300 300 0 0 1 960 1620H840A300 300 0 0 1 540 1320V860A300 300 0 0 1 840 560Z"/>
      <rect x="400" y="420" width="1000" height="1340" rx="440" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5"/>
      <g clip-path="url(#ov-pane)"><rect x="540" y="560" width="720" height="250" fill="#f6efe9"/><rect x="540" y="804" width="720" height="10" fill="#e3d4c9"/><rect x="860" y="814" width="80" height="22" rx="11" fill="#d8c8bd"/>
        <polygon points="600,830 820,830 640,1620 540,1620" fill="#fff" opacity=".16"/></g>
      <rect x="540" y="560" width="720" height="1060" rx="300" fill="none" stroke="#fff" stroke-width="22"/>
      <polygon points="1260,980 1800,1500 1800,2400 1260,1560" fill="#fff" opacity=".09"/></g>`,
  },
};

/** The colour of the title band for this project's photo, if it has one. */
export function photoBand(id: string, photo: string | undefined): string | null {
  const a = ART[id];
  return a?.band && photo?.trim() === a.photo ? a.band : null;
}

/**
 * The project's photo with its graphics, as an SVG (fills its box like a cover photo), or null when
 * there's no overlay for it.
 */
export function photoArt(id: string, photo: string | undefined): string | null {
  const a = ART[id];
  if (!a || photo?.trim() !== a.photo) return null;
  const [top, height] = a.view;
  return `<svg viewBox="0 ${top} ${a.w} ${height}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${a.defs}</defs><image href="${url(a.photo.replace(/^\//, ''))}" width="${a.w}" height="${a.h}"/>${a.art}</svg>`;
}
