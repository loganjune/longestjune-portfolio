// Builds editing forms from a short description of each section (see sections.ts).
// Forms change the data object in place and call `onChange` so the screen knows there are unsaved edits.
import { el, icon, iconButton, button, toast, plural, confirmBox } from './ui';
import { preparePhoto, photoName, showImage, rememberPreview, photoBlob, PHOTO_ACCEPT, type Prepared } from './images';
import { cropPhoto } from './cropper';
import { GitHubError, type Change } from './github';
import { scene, SCENES } from '../lib/scene';
import { sortable, moveItem } from './sortable';

export type Field =
  | { kind: 'text' | 'textarea'; key: string; label: string; hint?: string; placeholder?: string; big?: boolean }
  | { kind: 'select'; key: string; label: string; options: string[]; hint?: string }
  | { kind: 'picture'; label?: string; folder: string; hint?: string; photoOnly?: boolean }
  | { kind: 'paragraphs'; key: string; label: string; hint?: string }
  | { kind: 'object'; key: string; label: string; fields: Field[] }
  | {
      kind: 'list';
      key: string;
      label: string;
      itemName: string;
      fields: Field[];
      summary: (item: any) => string;
      newItem: () => any;
      hint?: string;
      thumbs?: boolean;
      bulkPhotos?: { folder: string; make: (photo: string) => any };
    };

/** Photos chosen in this form, waiting to be uploaded with the next Save. Key: repo path. */
export type Uploads = Map<string, Uint8Array>;

export type Ctx = { uploads: Uploads; onChange: () => void };

/**
 * The bar at the bottom of an editing screen. Changes save themselves (to drafts) a couple of seconds
 * after the last edit; the bar shows "Saving…", then "All changes saved".
 * `save` gets the photos waiting to be uploaded, and should commit them with the screen's own file.
 * `extra` is shown on the right (e.g. Delete). `ready` can hold saving back, returning a short
 * reason instead of true (e.g. a new item needs its title first).
 */
export function saveBar(
  initial: string,
  save: (photos: Change[]) => Promise<void>,
  extra: HTMLElement | null = null,
  opts: { ready?: () => true | string } = {},
) {
  const uploads: Uploads = new Map();
  let dirty = false;
  let running: Promise<void> | null = null;
  let timer = 0;
  const status = el('span', { cls: 'ed-status soft', role: 'status' }, initial);
  const footer = el('div', { cls: 'ed-savebar' }, status, el('span', { cls: 'ed-actions' }, extra));

  const schedule = (ms: number) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => void run(), ms);
  };

  const run = async (): Promise<void> => {
    if (running) {
      await running; // one save at a time; changes made meanwhile get their own save next
      return dirty ? run() : undefined;
    }
    if (!dirty) return;
    const ready = opts.ready?.() ?? true;
    if (ready !== true) {
      status.textContent = ready;
      return;
    }
    const batch = [...uploads];
    dirty = false;
    status.textContent = 'Saving…';
    running = (async () => {
      try {
        await save(batch.map(([path, bytes]) => ({ path, bytes })));
        for (const [path] of batch) uploads.delete(path);
        status.textContent = dirty ? 'Unsaved changes' : 'All changes saved';
      } catch (e) {
        dirty = true;
        status.textContent = (e as Error).message;
        // Network trouble: try again shortly. (Problems like a missing title wait for the next edit.)
        if (e instanceof GitHubError || e instanceof TypeError) schedule(15000);
      }
    })();
    await running;
    running = null;
    if (dirty && !opts.ready || dirty && opts.ready?.() === true) schedule(2000);
  };

  // Leaving a field (e.g. the title of a new item) is a good moment to save.
  const onFocusOut = () => {
    if (!footer.isConnected) return document.removeEventListener('focusout', onFocusOut);
    if (dirty) schedule(400);
  };
  document.addEventListener('focusout', onFocusOut);

  const ctx: Ctx = {
    uploads,
    onChange: () => {
      dirty = true;
      status.textContent = 'Unsaved changes';
      schedule(2000);
    },
  };

  /** Saves anything waiting right now. Resolves true when everything is saved. */
  const flush = async () => {
    clearTimeout(timer);
    await run();
    return !dirty;
  };

  return { ctx, isDirty: () => dirty || !!running, flush, footer };
}

export function renderFields(fields: Field[], data: any, ctx: Ctx): HTMLElement {
  const box = el('div', { cls: 'ed-fields' });
  for (const f of fields) box.append(renderField(f, data, ctx));
  return box;
}

function renderField(f: Field, data: any, ctx: Ctx): HTMLElement {
  switch (f.kind) {
    case 'text':
    case 'textarea': {
      const input = f.kind === 'text' ? el('input', { placeholder: f.placeholder || '' }) : el('textarea', { rows: f.big ? 5 : 3, placeholder: f.placeholder || '' });
      input.value = data[f.key] ?? '';
      input.addEventListener('input', () => {
        data[f.key] = input.value;
        ctx.onChange();
      });
      return field(f.label, input, f.hint);
    }
    case 'select': {
      const sel = el('select', {}, ...f.options.map((o) => el('option', { value: o, selected: data[f.key] === o }, o)));
      sel.addEventListener('change', () => {
        data[f.key] = sel.value;
        ctx.onChange();
      });
      return field(f.label, sel, f.hint);
    }
    case 'paragraphs': {
      const list: string[] = (data[f.key] ||= []);
      const wrap = el('div', { cls: 'ed-paras' });
      const draw = () => {
        wrap.replaceChildren(
          ...list.map((p, i) => {
            const ta = el('textarea', { rows: 4, 'aria-label': `Paragraph ${i + 1}` });
            ta.value = p;
            ta.addEventListener('input', () => {
              list[i] = ta.value;
              ctx.onChange();
            });
            return el(
              'div',
              { cls: 'ed-para' },
              grip(`Paragraph ${i + 1}`),
              ta,
              el(
                'div',
                { cls: 'ed-row-tools' },
                iconButton('trash', 'Remove paragraph', async () => {
                  if (!(await confirmBox('Remove this paragraph?', 'It will be taken out when you save.', 'Remove', true))) return;
                  list.splice(i, 1);
                  draw();
                  ctx.onChange();
                }),
              ),
            );
          }),
          button('Add a paragraph', () => {
            list.push('');
            draw();
            ctx.onChange();
          }, 'ed-btn quiet'),
        );
      };
      draw();
      makeSortable(wrap, '.ed-para', list, draw, ctx);
      return field(f.label, wrap, f.hint, true);
    }
    case 'object': {
      data[f.key] ||= {};
      return el('fieldset', { cls: 'ed-group' }, el('legend', { cls: 'lab' }, f.label), renderFields(f.fields, data[f.key], ctx));
    }
    case 'picture':
      return renderPicture(f, data, ctx);
    case 'list':
      return renderList(f, data, ctx);
  }
}

function field(label: string, control: HTMLElement, hint?: string, group = false) {
  return el(group ? 'div' : 'label', { cls: 'ed-field' }, el('span', { cls: 'lab' }, label), control, hint ? el('span', { cls: 'ed-hint' }, hint) : null);
}

/** The grip handle: drag it to reorder, or focus it and use the arrow keys. */
function grip(label: string) {
  return el('button', { type: 'button', cls: 'ed-icon ed-grip', 'aria-label': `${label}. Drag, or use the arrow keys, to reorder.`, title: 'Drag to reorder' }, icon('grip'));
}

/** Turns on drag-and-drop for a list that redraws itself from `list`. */
function makeSortable(container: HTMLElement, items: string, list: any[], redraw: () => void, ctx: Ctx) {
  sortable({
    container,
    items,
    handle: '.ed-grip',
    onMove: (from, to) => {
      moveItem(list, from, to);
      redraw();
      ctx.onChange();
    },
  });
}

/** Keeps a prepared photo for the next Save and returns its site path (/images/<folder>/<name>). */
export function keepPhoto(p: Prepared, original: string, folder: string, ctx: Ctx): string {
  const sitePath = `/images/${folder}/${photoName(original, p.ext)}`;
  ctx.uploads.set(`public${sitePath}`, p.bytes);
  rememberPreview(sitePath, p.previewUrl);
  return sitePath;
}

/** Upload one photo: shrink it, remember it for the next Save, and return its site path. */
export async function addPhoto(file: File, folder: string, ctx: Ctx): Promise<string> {
  return keepPhoto(await preparePhoto(file), file.name, folder, ctx);
}

/**
 * Adds one photo after opening the photo editor on it (crop, rotate, look). "Use as is" keeps it
 * unchanged; Cancel resolves null and the photo isn't added.
 */
export async function addPhotoEdited(file: File, folder: string, ctx: Ctx): Promise<string | null> {
  const edited = await cropPhoto(file, { asIs: true });
  if (edited === null) return null;
  return keepPhoto(edited === 'as-is' ? await preparePhoto(file) : edited, file.name, folder, ctx);
}

/** Opens the photo editor (crop, rotate, look) for a photo already in the editor; returns the new photo's path, or null. */
/** Opens a built-in drawing (sea, pool…) in the photo editor; saving makes it an ordinary photo. */
export async function editDrawing(picture: string, folder: string, ctx: Ctx): Promise<string | null> {
  const edited = await cropPhoto(await drawingBlob(picture));
  if (!edited || edited === 'as-is') return null;
  return keepPhoto(edited, picture, folder, ctx);
}

/** A built-in drawing as a 2400 × 1600 PNG. */
async function drawingBlob(picture: string): Promise<Blob> {
  const svg = scene(picture).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" ');
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 2400;
    c.height = 1600;
    c.getContext('2d')!.drawImage(img, 0, 0, 2400, 1600);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
    if (!blob) throw new Error('Couldn’t open the drawing.');
    return blob;
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

export async function editPhoto(sitePath: string, folder: string, ctx: Ctx): Promise<string | null> {
  const edited = await cropPhoto(await photoBlob(sitePath));
  if (!edited || edited === 'as-is') return null;
  const base = (sitePath.split('/').pop() || 'photo').replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}-/, '').replace(/-[a-z0-9]{4}$/, '');
  return keepPhoto(edited, base, folder, ctx);
}

function picker(multiple: boolean, onFiles: (files: File[]) => void) {
  const input = el('input', { type: 'file', accept: PHOTO_ACCEPT, multiple, cls: 'ed-file' });
  input.addEventListener('change', () => {
    const files = [...(input.files || [])];
    input.value = '';
    if (files.length) onFiles(files);
  });
  return input;
}

/** Fills `box` with an item's photo, or its built-in drawing. */
export function showPicture(box: HTMLElement, item: any) {
  if (item.photo) {
    const img = el('img', { alt: '' });
    showImage(img, item.photo);
    box.replaceChildren(img);
  } else {
    box.innerHTML = scene(item.picture || 'sea'); // built-in drawing: our own SVG, not user input
  }
}

/** A picture is either an uploaded photo (`photo`) or one of the built-in drawings (`picture`). */
function renderPicture(f: Extract<Field, { kind: 'picture' }>, data: any, ctx: Ctx): HTMLElement {
  const preview = el('div', { cls: 'ed-pic' });
  const tools = el('div', { cls: 'ed-pic-tools' });
  const draw = () => {
    showPicture(preview, data);
    const file = picker(false, async ([file]) => {
      try {
        data.photo = await addPhoto(file, f.folder, ctx);
        ctx.onChange();
        draw();
      } catch (e) {
        toast((e as Error).message, 'error');
      }
    });
    const sel = el('select', { 'aria-label': 'Drawing' }, ...SCENES.map((s) => el('option', { value: s, selected: (data.picture || 'sea') === s }, s)));
    sel.addEventListener('change', () => {
      data.picture = sel.value;
      ctx.onChange();
      draw();
    });
    const upload = el('label', { cls: 'ed-btn' }, icon('photo', 16), data.photo ? ' Replace photo' : ' Upload photo', file);
    if (f.photoOnly) return tools.replaceChildren(upload);
    tools.replaceChildren(
      upload,
      data.photo
        ? button('Use drawing instead', () => {
            data.photo = '';
            ctx.onChange();
            draw();
          }, 'ed-btn quiet')
        : el('label', { cls: 'ed-inline' }, el('span', { cls: 'lab' }, 'Drawing'), sel),
    );
  };
  draw();
  return field(f.label || 'Picture', el('div', { cls: 'ed-picbox' }, preview, tools), f.hint, true);
}

function renderList(f: Extract<Field, { kind: 'list' }>, data: any, ctx: Ctx): HTMLElement {
  const list: any[] = (data[f.key] ||= []);
  const box = el('ol', { cls: 'ed-items' });
  const open = new Set<any>();
  const name = f.itemName.toLowerCase();
  const title = (item: any) => f.summary(item) || `New ${name}`;

  const draw = () => {
    box.replaceChildren(
      ...list.map((item, i) => {
        const isOpen = open.has(item);
        const thumb = f.thumbs ? el('span', { cls: 'ed-thumb' }) : null;
        if (thumb) showPicture(thumb, item);
        const head = el(
          'div',
          { cls: 'ed-item-head' },
          grip(title(item)),
          el(
            'button',
            {
              type: 'button',
              cls: 'ed-item-toggle',
              'aria-expanded': String(isOpen),
              on: {
                click: () => {
                  isOpen ? open.delete(item) : open.add(item);
                  draw();
                },
              },
            },
            thumb,
            el('span', { cls: 'ed-item-title' }, title(item)),
            el('span', { cls: `ed-chev${isOpen ? ' open' : ''}` }, icon('chevron', 16)),
          ),
          el(
            'div',
            { cls: 'ed-row-tools' },
            iconButton('trash', `Remove ${name}`, async () => {
              if (!(await confirmBox(`Remove this ${name}?`, `“${title(item)}” will be taken out when you save. Until you publish, you can still discard the change.`, 'Remove', true))) return;
              list.splice(i, 1);
              open.delete(item);
              draw();
              ctx.onChange();
              toast(`${f.itemName} removed.`);
            }),
          ),
        );
        const body = isOpen ? el('div', { cls: 'ed-item-body' }, renderFields(f.fields, item, { ...ctx, onChange: () => (ctx.onChange(), refreshTitle()) })) : null;
        const li = el('li', { cls: `ed-item${isOpen ? ' open' : ''}` }, head, body);
        const refreshTitle = () => {
          const t = li.querySelector('.ed-item-title');
          if (t) t.textContent = title(item);
        };
        return li;
      }),
    );
  };

  const addBtn = button(`Add ${name}`, () => {
    const item = f.newItem();
    list.push(item);
    open.add(item);
    draw();
    ctx.onChange();
    box.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 'ed-btn');
  addBtn.prepend(icon('plus', 16), ' ');

  const bulk = f.bulkPhotos
    ? el(
        'label',
        { cls: 'ed-btn solid' },
        icon('photo', 16),
        ' Add photos',
        picker(true, async (files) => {
          for (const file of files) {
            try {
              const photo = await addPhoto(file, f.bulkPhotos!.folder, ctx);
              list.push(f.bulkPhotos!.make(photo));
            } catch (e) {
              toast((e as Error).message, 'error');
            }
          }
          draw();
          ctx.onChange();
          toast(`${plural(files.length, 'photo')} added.`);
        }),
      )
    : null;

  draw();
  makeSortable(box, '.ed-item', list, draw, ctx);
  return el(
    'div',
    { cls: 'ed-field' },
    el('div', { cls: 'ed-list-head' }, el('span', { cls: 'lab' }, f.label), el('span', { cls: 'ed-actions' }, bulk, addBtn)),
    f.hint ? el('span', { cls: 'ed-hint' }, f.hint) : null,
    box,
  );
}
