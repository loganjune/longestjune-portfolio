// Small helpers for building the editor's screens without a UI framework.
// Text is always inserted as text (never as HTML), so nothing typed or received can run as code.

type Props = Record<string, any> & { cls?: string; on?: Record<string, (e: any) => void> };
type Kid = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...kids: Kid[]) {
  const n = document.createElement(tag);
  const { cls, on, ...rest } = props;
  if (cls) n.className = cls;
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined || v === null || v === false) continue;
    if (k in n && typeof v !== 'string') (n as any)[k] = v;
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  if (on) for (const [ev, fn] of Object.entries(on)) n.addEventListener(ev, fn);
  for (const k of kids) if (k !== null && k !== undefined && k !== false) n.append(k);
  return n;
}

// Outlined icons, drawn in the site's ink colour (currentColor). Paths are fixed strings, never user input.
const PATHS: Record<string, string> = {
  bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
  italic: '<path d="M14 5h-4M14 19h-4M14 5l-4 14"/>',
  h2: '<path d="M4 6v12M12 6v12M4 12h8M16 10.5a2.5 2.5 0 1 1 4 2l-4 5.5h4.5"/>',
  h3: '<path d="M4 6v12M12 6v12M4 12h8M16 9h4l-2.5 3a2.6 2.6 0 1 1-1.8 4.5"/>',
  ul: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  ol: '<path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 14.5a1.5 1.5 0 1 1 2.3 1.3L3.5 19H6"/>',
  quote: '<path d="M6 17c-1.5-1-2-2.5-2-4.5C4 9 6 7 9 6.5M15 17c-1.5-1-2-2.5-2-4.5 0-3.5 2-5.5 5-6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  photo: '<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.5L20 17"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  adjust: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  crop: '<path d="M6 2.5V16a2 2 0 0 0 2 2h13.5M2.5 6H16a2 2 0 0 1 2 2v13.5"/>',
  move: '<path d="M4 7h16v13H4zM9 7V4h6v3M9.5 13.5h5M12 11v5"/>',
  grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
};

export function icon(name: string, size = 18): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = PATHS[name] || '';
  return svg;
}

/** A round outlined icon button with an accessible name (and a tooltip). */
export function iconButton(name: string, label: string, onClick: () => void, extra: Props = {}) {
  return el('button', { ...extra, type: 'button', cls: `ed-icon ${extra.cls || ''}`, 'aria-label': label, title: label, on: { click: onClick } }, icon(name));
}

export function button(text: string, onClick: () => void, cls = 'ed-btn', extra: Props = {}) {
  return el('button', { type: 'button', cls, on: { click: onClick }, ...extra }, text);
}

/** Runs an async action with the button showing it's busy, and reports errors. */
export async function busy(btn: HTMLButtonElement, label: string, fn: () => Promise<void>) {
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = label;
  try {
    await fn();
  } catch (e) {
    toast((e as Error).message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}

/** "1 photo", "3 photos". */
export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** A list of rows divided by hairlines, or a quiet line when there's nothing to list. */
export function rowList(items: Node[], empty = '') {
  return el('ul', { cls: 'ed-rows' }, ...(items.length ? items : [el('li', { cls: 'soft ed-empty' }, empty)]));
}

/**
 * One row: a small label (optional), the title, then an arrow if `to` is a link,
 * or `to` itself if it's a button.
 */
export function row(label: string | null, title: Kid[], to: string | HTMLElement | null = null) {
  const parts = [label === null ? null : el('span', { cls: 'lab soft' }, label), el('span', { cls: 'ed-row-title' }, ...title)];
  const cls = `ed-row${label === null ? ' no-lab' : ''}`;
  if (typeof to === 'string') return el('li', {}, el('a', { href: to, cls }, ...parts, el('span', { cls: 'ed-arrow' }, '→')));
  return el('li', { cls: `${cls} static` }, ...parts, to);
}

let toastBox: HTMLElement | null = null;
export function toast(message: string, kind: 'ok' | 'error' = 'ok') {
  toastBox ||= document.body.appendChild(el('div', { cls: 'ed-toasts', role: 'status', 'aria-live': 'polite' }));
  const t = el('div', { cls: `ed-toast ${kind}` }, message);
  toastBox.append(t);
  setTimeout(() => t.remove(), kind === 'error' ? 9000 : 4000);
}

/** Shows a modal dialog. `build` gets a `close` function; Escape closes with `cancelValue`. */
export function dialog<T>(cancelValue: T, build: (close: (v: T) => void) => Node[], cls = 'ed-dialog'): Promise<T> {
  return new Promise((resolve) => {
    const dlg = el('dialog', { cls });
    const close = (v: T) => {
      dlg.close();
      dlg.remove();
      resolve(v);
    };
    dlg.append(...build(close));
    dlg.addEventListener('cancel', () => close(cancelValue));
    document.body.append(dlg);
    dlg.showModal();
  });
}

/** A styled confirm box. Resolves true if the person agrees. */
export function confirmBox(title: string, text: string, yes = 'Yes', danger = false): Promise<boolean> {
  return dialog(false, (close) => [
    el('h2', { cls: 'ed-dialog-title' }, title),
    el('p', {}, text),
    el('div', { cls: 'ed-actions' }, button('Cancel', () => close(false), 'ed-btn quiet'), button(yes, () => close(true), danger ? 'ed-btn danger' : 'ed-btn solid')),
  ]);
}

/** A question with several answers. Resolves with the chosen answer's value, or null if cancelled. The last choice is the main button. */
export function chooseBox<T extends string>(title: string, text: string, choices: { label: string; value: T }[]): Promise<T | null> {
  return dialog<T | null>(null, (close) => [
    el('h2', { cls: 'ed-dialog-title' }, title),
    el('p', {}, text),
    el(
      'div',
      { cls: 'ed-actions' },
      button('Cancel', () => close(null), 'ed-btn quiet'),
      ...choices.map((c, i) => button(c.label, () => close(c.value), i === choices.length - 1 ? 'ed-btn solid' : 'ed-btn')),
    ),
  ]);
}

/** A styled one-line question. Resolves with the answer, or null if cancelled. */
export function askBox(title: string, label: string, value = '', placeholder = ''): Promise<string | null> {
  const input = el('input', { value, placeholder, 'aria-label': label });
  const answer = dialog<string | null>(null, (close) => [
    el(
      'form',
      { method: 'dialog', on: { submit: (e: Event) => (e.preventDefault(), close(input.value.trim())) } },
      el('h2', { cls: 'ed-dialog-title' }, title),
      el('label', { cls: 'ed-field' }, el('span', { cls: 'lab' }, label), input),
      el('div', { cls: 'ed-actions' }, button('Cancel', () => close(null), 'ed-btn quiet'), el('button', { type: 'submit', cls: 'ed-btn solid' }, 'OK')),
    ),
  ]);
  input.focus();
  input.select();
  return answer;
}

/** Turns a repo path into something readable: "src/data/projects.json" -> "Projects". */
export function describePath(path: string): string {
  const note = path.match(/^src\/content\/notes\/(.+)\.mdx?$/);
  if (note) return `Story: ${note[1].replace(/-/g, ' ')}`;
  const project = path.match(/^src\/content\/projects\/(.+)\.md$/);
  if (project) return `Project: ${project[1].replace(/-/g, ' ')}`;
  const album = path.match(/^src\/content\/albums\/(.+)\.md$/);
  if (album) return `Album: ${album[1].replace(/-/g, ' ')}`;
  const data = path.match(/^src\/data\/(.+)\.json$/);
  if (data) return ({ site: 'Site text & About', now: 'Currently', projects: 'Project order', gallery: 'Gallery', shop: 'Shop', resume: 'Resume', services: 'Service settings' } as Record<string, string>)[data[1]] || data[1];
  const img = path.match(/^public\/images\/(.+)$/);
  if (img) return `Photo: ${img[1]}`;
  return path;
}
