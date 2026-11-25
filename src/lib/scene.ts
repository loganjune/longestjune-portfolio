// Built-in pictures: sea, room, pool, wall, dune, dusk.
export const SCENES = ['sea', 'room', 'pool', 'wall', 'dune', 'dusk'];

let uid = 0;

/**
 * Draws one of the built-in summer "photographs" as an SVG string.
 * `idPrefix` keeps the drawing's internal ids unique on the page; React components pass their own.
 */
export function scene(k: string, idPrefix?: string): string {
  const u = idPrefix ?? 's' + (uid++); let d = '', b = '';
  if(k==='sea'){
    d=`<linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8db6d6"/><stop offset=".62" stop-color="#e6c7cf"/><stop offset=".66" stop-color="#f4d8d6"/></linearGradient><linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fbfd6"/><stop offset="1" stop-color="#4d7593"/></linearGradient><radialGradient id="${u}c"><stop offset="0" stop-color="#fff4ea"/><stop offset=".25" stop-color="#fbe3dc" stop-opacity=".9"/><stop offset="1" stop-color="#f4d0d4" stop-opacity="0"/></radialGradient>`;
    b=`<rect width="1200" height="800" fill="url(#${u}a)"/><circle cx="600" cy="500" r="260" fill="url(#${u}c)"/><circle cx="600" cy="500" r="46" fill="#fff6ee"/><rect y="528" width="1200" height="272" fill="url(#${u}b)"/>`;
    for(let i=0;i<14;i++){const w=90-i*5,y=540+i*16;b+=`<rect x="${600-w/2}" y="${y}" width="${w}" height="${3+i*.3}" rx="2" fill="#fde9e2" opacity="${.75-i*.04}"/>`}
    for(let i=0;i<40;i++){const x=(i*137)%1200,y=560+(i*53)%230;b+=`<rect x="${x}" y="${y}" width="${30+(i*7)%50}" height="1.5" fill="#cfe2ee" opacity=".35"/>`}
  }
  if(k==='room'){
    d=`<linearGradient id="${u}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3ece6"/><stop offset="1" stop-color="#dcd0c6"/></linearGradient><linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9cde6"/><stop offset="1" stop-color="#f1d6dc"/></linearGradient><filter id="${u}f"><feGaussianBlur stdDeviation="14"/></filter>`;
    b=`<rect width="1200" height="800" fill="url(#${u}a)"/><rect y="600" width="1200" height="200" fill="#cdbfb3"/><rect x="430" y="110" width="340" height="420" fill="#cbbfb5"/><rect x="446" y="126" width="308" height="388" fill="url(#${u}b)"/><rect x="597" y="126" width="6" height="388" fill="#d8ccc2"/><rect x="446" y="318" width="308" height="6" fill="#d8ccc2"/><path d="M470 600L760 600 980 790 560 790Z" fill="#f6e4e2" opacity=".85" filter="url(#${u}f)"/><rect x="180" y="540" width="260" height="60" fill="#b9a99b"/><rect x="180" y="540" width="260" height="10" fill="#cbbcae"/><ellipse cx="300" cy="530" rx="22" ry="10" fill="#9a8a7e"/><path d="M290 530c0-60 20-70 10-120M300 528c10-50 40-60 50-90" stroke="#6f7f6a" stroke-width="4" fill="none"/>`;
  }
  if(k==='pool'){
    d=`<linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe0f0"/><stop offset="1" stop-color="#6fa9cf"/></linearGradient><pattern id="${u}p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="2"/></pattern>`;
    b=`<rect width="1200" height="800" fill="url(#${u}a)"/><rect width="1200" height="800" fill="url(#${u}p)"/><rect width="1200" height="120" fill="#f4dfe1"/><rect y="112" width="1200" height="10" fill="#e6c9cd"/><rect x="0" y="400" width="1200" height="16" fill="#2f5f86" opacity=".5"/>`;
    for(let i=0;i<12;i++){const y=170+i*55;b+=`<path d="M0 ${y}q75 -18 150 0t150 0 150 0 150 0 150 0 150 0 150 0 150 0" fill="none" stroke="#ffffff" stroke-opacity=".28" stroke-width="3"/>`}
  }
  if(k==='wall'){
    d=`<linearGradient id="${u}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8e1e3"/><stop offset="1" stop-color="#e9c6ca"/></linearGradient><filter id="${u}f"><feGaussianBlur stdDeviation="9"/></filter>`;
    b=`<rect width="1200" height="800" fill="url(#${u}a)"/><g fill="#9fb4c8" opacity=".38" filter="url(#${u}f)">`;
    for(let i=0;i<7;i++)b+=`<path transform="rotate(${-30+i*9} 900 -40)" d="M900 -40c40 200 30 420 -10 640c-60-220-50-440 10-640z"/>`;
    b+=`</g><rect x="140" y="560" width="520" height="14" fill="#d6b3b8"/><rect x="140" y="574" width="520" height="30" fill="#e0bcc1" opacity=".5"/><ellipse cx="260" cy="520" rx="34" ry="40" fill="#fbf2ee"/><rect x="420" y="470" width="40" height="90" rx="6" fill="#bcd4e6"/>`;
  }
  if(k==='dune'){
    d=`<linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe4f2"/><stop offset="1" stop-color="#f7e3e2"/></linearGradient>`;
    b=`<rect width="1200" height="800" fill="url(#${u}a)"/><path d="M0 470C200 420 380 430 560 470S920 520 1200 450V800H0Z" fill="#efd3cf"/><path d="M0 560C260 500 420 520 640 580S1000 620 1200 540V800H0Z" fill="#e7c2bd"/><path d="M640 580C800 620 1000 620 1200 540V800H760Z" fill="#d9aea9" opacity=".6"/><path d="M0 680C300 640 620 660 900 720S1100 760 1200 730V800H0Z" fill="#dcb2ad"/>`;
  }
  if(k==='dusk'){
    d=`<linearGradient id="${u}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3e5f86"/><stop offset=".6" stop-color="#a7a8c6"/><stop offset=".72" stop-color="#eab9c2"/></linearGradient>`;
    b=`<rect width="1200" height="800" fill="url(#${u}a)"/><rect y="580" width="1200" height="220" fill="#36506d"/><rect y="580" width="1200" height="2" fill="#f2c6cc" opacity=".7"/><path d="M860 170a40 40 0 1 0 30 70a34 34 0 1 1 -30 -70z" fill="#fbeff0"/>`;
    for(let i=0;i<30;i++)b+=`<rect x="${(i*173)%1200}" y="${600+(i*41)%190}" width="${20+(i*11)%40}" height="1.5" fill="#f2c6cc" opacity=".3"/>`;
  }
  return `<svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${d}</defs>${b}</svg>`;
}
