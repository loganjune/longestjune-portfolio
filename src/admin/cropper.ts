// The photo editor: crop, rotate, straighten, change the look (filters, black and white,
// brightness, contrast, saturation, warmth, tint, fade, vignette) and add a frame. Opens as a dialog and resolves with the edited
// photo, or null if cancelled ('as-is' if "Use as is" was offered and chosen).
// Drag inside the box to move it, drag a corner to resize it; arrow keys nudge the box.
import { el, button, icon } from './ui';
import { decodePhoto, fitCanvas, encodeCanvas, type Prepared } from './images';
import { applyLook, addFrame, frameSize, FILTERS, FRAMES, PLAIN, type Look } from './look';

type Box = { x: number; y: number; w: number; h: number }; // fractions (0–1) of the picture
const SHAPES: { label: string; ratio: number | null | 'original' }[] = [
  { label: 'Free', ratio: null },
  { label: 'Original', ratio: 'original' },
  { label: 'Square', ratio: 1 },
  { label: '4:5', ratio: 4 / 5 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
];
const MIN = 0.05; // smallest box, as a fraction of the picture

const PREVIEW = 1000; // the on-screen preview is at most this size, so sliders feel instant

export async function cropPhoto(source: Blob, opts: { asIs?: boolean } = {}): Promise<Prepared | null | 'as-is'> {
  const bitmap = await decodePhoto(source);
  // Work on a copy no larger than the final size, so rotating and cropping stay quick.
  const original = fitCanvas(bitmap, bitmap.width, bitmap.height);
  bitmap.close();

  let turns = 0; // quarter turns clockwise
  let angle = 0; // fine straightening, in degrees (−15 to 15)
  let work = original; // full size, turned and straightened (not shown)
  let base = original; // a small copy of `work` for the preview
  let look: Look = { ...PLAIN };
  let border = FRAMES[0];
  let box: Box = { x: 0, y: 0, w: 1, h: 1 };
  let ratio: number | null = null; // width / height of the box in pixels, or free

  return new Promise((resolve) => {
    const dlg = el('dialog', { cls: 'ed-dialog crop', 'aria-label': 'Edit photo' });
    const stage = el('div', { cls: 'crop-stage' }); // holds the picture, with room around it for a frame
    const pic = el('div', { cls: 'crop-pic' });
    const view = el('canvas'); // what you see: the small copy with the look applied
    const frame = el('div', { cls: 'crop-frame', tabindex: '0', 'aria-label': 'Crop area. Drag to move, or use the arrow keys.' });
    const matte = el('span', { cls: 'crop-matte', hidden: true }); // the frame's preview, around the crop box
    frame.append(matte);
    for (const c of ['nw', 'ne', 'sw', 'se']) frame.append(el('span', { cls: `crop-handle ${c}`, 'data-corner': c }));
    pic.append(view, frame);
    stage.append(pic);

    /** Redraws the preview from the small copy, with the current look. */
    let queued = 0;
    const paint = () => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(() => {
        view.width = base.width;
        view.height = base.height;
        view.getContext('2d')!.drawImage(base, 0, 0);
        applyLook(view, look);
      });
    };
    const rebase = () => {
      const scale = Math.min(1, PREVIEW / Math.max(work.width, work.height));
      const c = document.createElement('canvas');
      c.width = Math.round(work.width * scale);
      c.height = Math.round(work.height * scale);
      c.getContext('2d')!.drawImage(work, 0, 0, c.width, c.height);
      base = c;
      paint();
    };

    const close = (v: Prepared | null | 'as-is') => {
      dlg.close();
      dlg.remove();
      resolve(v);
    };

    const draw = () => {
      Object.assign(frame.style, { left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` });
      matte.hidden = !border.side;
      stage.style.padding = '';
      if (!border.side) return;
      // The frame goes outside the crop box, as it will on the saved photo; the stage makes room for it.
      const r = pic.getBoundingClientRect();
      const { side, bottom } = frameSize(border, box.w * r.width, box.h * r.height);
      stage.style.padding = `${side}px ${side}px ${bottom}px`;
      Object.assign(matte.style, { inset: `-${side}px -${side}px -${bottom}px`, borderWidth: `${side}px ${side}px ${bottom}px`, borderColor: border.color });
    };

    /** The largest centred box with the chosen shape. */
    const fitShape = () => {
      if (!ratio) return;
      const r = ratio / (work.width / work.height); // shape in fractions of this picture
      box = r > 1 ? { w: 1, h: 1 / r, x: 0, y: (1 - 1 / r) / 2 } : { w: r, h: 1, x: (1 - r) / 2, y: 0 };
    };

    /**
     * Redraws the picture turned by quarter turns plus the fine straightening angle. When
     * straightened, it's enlarged just enough that no empty corners show.
     */
    const render = () => {
      const side = turns % 2 === 1;
      const W = side ? original.height : original.width;
      const H = side ? original.width : original.height;
      const t = (Math.abs(angle) * Math.PI) / 180;
      const zoom = Math.cos(t) + Math.max(W / H, H / W) * Math.sin(t);
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const x = c.getContext('2d')!;
      x.translate(W / 2, H / 2);
      x.rotate((turns * Math.PI) / 2 + (angle * Math.PI) / 180);
      x.scale(zoom, zoom);
      x.drawImage(original, -original.width / 2, -original.height / 2);
      work = c;
      rebase();
    };

    const rotate = (by: number) => {
      turns = (turns + by + 4) % 4;
      render();
      box = { x: 0, y: 0, w: 1, h: 1 };
      fitShape();
      draw();
    };

    const straighten = el('input', { type: 'range', min: '-15', max: '15', step: '0.5', value: '0', 'aria-label': 'Straighten' });
    const angleLabel = el('span', { cls: 'crop-angle' }, '0°');
    straighten.addEventListener('input', () => {
      angle = Number(straighten.value);
      angleLabel.textContent = `${angle > 0 ? '+' : ''}${angle}°`;
      render(); // the crop box stays where it is while straightening
    });

    // Dragging: move the whole box, or resize from a corner.
    let drag: { mode: string; startX: number; startY: number; start: Box } | null = null;
    frame.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const corner = (e.target as HTMLElement).dataset.corner || 'move';
      drag = { mode: corner, startX: e.clientX, startY: e.clientY, start: { ...box } };
      frame.setPointerCapture(e.pointerId);
    });
    frame.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const r = pic.getBoundingClientRect();
      const dx = (e.clientX - drag.startX) / r.width;
      const dy = (e.clientY - drag.startY) / r.height;
      const s = drag.start;
      if (drag.mode === 'move') {
        box = { ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) };
      } else {
        const west = drag.mode.includes('w');
        const north = drag.mode.includes('n');
        // The opposite corner stays put.
        const ax = west ? s.x + s.w : s.x;
        const ay = north ? s.y + s.h : s.y;
        let w = clamp(west ? s.w - dx : s.w + dx, MIN, west ? ax : 1 - ax);
        let h = clamp(north ? s.h - dy : s.h + dy, MIN, north ? ay : 1 - ay);
        if (ratio) {
          const r2 = ratio / (work.width / work.height);
          // Follow whichever side moved more, then make sure it still fits.
          if (w / h > r2) w = h * r2;
          else h = w / r2;
          const maxW = west ? ax : 1 - ax;
          const maxH = north ? ay : 1 - ay;
          if (w > maxW) (w = maxW), (h = w / r2);
          if (h > maxH) (h = maxH), (w = h * r2);
        }
        box = { w, h, x: west ? ax - w : ax, y: north ? ay - h : ay };
      }
      draw();
    });
    const end = () => (drag = null);
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);
    frame.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.05 : 0.01;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      box = { ...box, x: clamp(box.x + d[0], 0, 1 - box.w), y: clamp(box.y + d[1], 0, 1 - box.h) };
      draw();
    });

    const shapeButtons = SHAPES.map((sh) => {
      const b = button(sh.label, () => {
        ratio = sh.ratio === 'original' ? original.width / original.height : sh.ratio;
        if (sh.ratio === 'original' && turns % 2 === 1) ratio = original.height / original.width;
        shapeButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        if (ratio) fitShape();
        else box = { x: 0, y: 0, w: 1, h: 1 };
        draw();
      }, 'crop-shape');
      b.setAttribute('aria-pressed', String(sh.ratio === null));
      return b;
    });

    const apply = button('Apply', async () => {
      apply.disabled = true;
      apply.textContent = 'Saving…';
      const sx = Math.round(box.x * work.width);
      const sy = Math.round(box.y * work.height);
      const sw = Math.max(1, Math.round(box.w * work.width));
      const sh = Math.max(1, Math.round(box.h * work.height));
      const out = document.createElement('canvas');
      out.width = sw;
      out.height = sh;
      out.getContext('2d')!.drawImage(work, sx, sy, sw, sh, 0, 0, sw, sh);
      applyLook(out, look); // the full-size photo gets the same look as the preview
      close(await encodeCanvas(addFrame(out, border)));
    }, 'ed-btn solid');

    // ---- the look: filters, black and white, sliders ----
    const sliders: Record<string, HTMLInputElement> = {};
    const bw = el('input', { type: 'checkbox' });
    const filterButtons = FILTERS.map((f) => {
      const b = button(f.name, () => setLook(f.look, b), 'crop-shape');
      b.setAttribute('aria-pressed', String(f.name === 'Original'));
      return b;
    });
    const syncControls = () => {
      for (const [k, input] of Object.entries(sliders)) input.value = String(look[k as keyof Look]);
      bw.checked = look.bw;
      for (const [k, out] of Object.entries(readouts)) out.textContent = signed(look[k as keyof Look] as number);
    };
    const setLook = (next: Look, pressed: HTMLButtonElement | null) => {
      look = { ...next };
      filterButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === pressed)));
      syncControls();
      paint();
    };
    const readouts: Record<string, HTMLElement> = {};
    const slider = (key: keyof Look, label: string, min: number) => {
      const input = el('input', { type: 'range', min: String(min), max: '100', step: '1', value: '0', 'aria-label': label });
      const out = el('span', { cls: 'crop-angle' }, '0');
      sliders[key] = input;
      readouts[key] = out;
      input.addEventListener('input', () => {
        (look as Record<string, number | boolean>)[key] = Number(input.value);
        out.textContent = signed(Number(input.value));
        filterButtons.forEach((x) => x.setAttribute('aria-pressed', 'false'));
        paint();
      });
      return el('label', { cls: 'crop-straighten' }, el('span', { cls: 'lab' }, label), input, out);
    };
    const frameButtons = FRAMES.map((f, i) => {
      const b = button(f.name, () => setFrame(i), 'crop-shape');
      b.setAttribute('aria-pressed', String(i === 0));
      return b;
    });
    const setFrame = (i: number) => {
      border = FRAMES[i];
      frameButtons.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
      draw();
    };
    bw.addEventListener('change', () => {
      look.bw = bw.checked;
      filterButtons.forEach((x) => x.setAttribute('aria-pressed', 'false'));
      paint();
    });

    const turn = (dir: number, label: string, name: string) => {
      const b = el('button', { type: 'button', cls: 'ed-icon', 'aria-label': label, title: label }, icon(name));
      b.addEventListener('click', () => rotate(dir));
      return b;
    };

    dlg.append(
      el('h2', { cls: 'ed-dialog-title' }, 'Edit photo'),
      el(
        'div',
        { cls: 'crop-layout' },
        stage,
        el(
          'div',
          { cls: 'crop-panel' },
          el('p', { cls: 'lab crop-heading' }, 'Crop'),
          el('label', { cls: 'crop-straighten' }, el('span', { cls: 'lab' }, 'Straighten'), straighten, angleLabel),
          el('div', { cls: 'crop-tools' }, el('div', { cls: 'crop-shapes', role: 'group', 'aria-label': 'Shape' }, ...shapeButtons), el('div', { cls: 'crop-turns' }, turn(-1, 'Rotate left', 'undo'), turn(1, 'Rotate right', 'redo'))),
          el('p', { cls: 'lab crop-heading' }, 'Look'),
          el('div', { cls: 'crop-shapes crop-filters', role: 'group', 'aria-label': 'Filters' }, ...filterButtons),
          el('label', { cls: 'ed-check crop-bw' }, bw, el('span', { cls: 'lab' }, 'Black and white')),
          slider('brightness', 'Brightness', -100),
          slider('contrast', 'Contrast', -100),
          slider('saturation', 'Saturation', -100),
          slider('warmth', 'Warmth', -100),
          slider('tint', 'Tint', -100),
          slider('fade', 'Fade', 0),
          slider('vignette', 'Vignette', 0),
          el('p', { cls: 'lab crop-heading' }, 'Frame'),
          el('div', { cls: 'crop-shapes', role: 'group', 'aria-label': 'Frame' }, ...frameButtons),
        ),
      ),
      el(
        'div',
        { cls: 'ed-actions' },
        button('Cancel', () => close(null), 'ed-btn quiet'),
        button('Reset', () => {
          angle = 0;
          straighten.value = '0';
          angleLabel.textContent = '0°';
          turns = 1;
          ratio = null;
          shapeButtons.forEach((x, i) => x.setAttribute('aria-pressed', String(i === 0)));
          setLook(PLAIN, filterButtons[0]);
          setFrame(0);
          rotate(-1);
        }, 'ed-btn quiet'),
        opts.asIs ? button('Use as is', () => close('as-is'), 'ed-btn quiet') : null,
        apply,
      ),
    );
    dlg.addEventListener('cancel', () => close(null));
    document.body.append(dlg);
    dlg.showModal();
    rebase();
    draw();
    frame.focus();
  });
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
