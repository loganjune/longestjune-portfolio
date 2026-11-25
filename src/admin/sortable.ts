// Drag-and-drop reordering for lists and grids, with mouse or touch.
// Each item has a small grip handle; you drag by the handle, so scrolling a page on a phone still works.
// The handle is also a button: with the keyboard, focus it and press the arrow keys to move the item.
// Nothing here changes the page itself: when you let go, `onMove(from, to)` is called and the screen redraws.

type Options = {
  /** The element whose children are the items. */
  container: HTMLElement;
  /** CSS selector for the items inside the container. */
  items: string;
  /** CSS selector for the grip handle inside each item. */
  handle: string;
  /** Called with the old and new position when an item is dropped or moved with the keyboard. */
  onMove: (from: number, to: number) => void;
  /** Grids reorder by left/right position as well as up/down. */
  grid?: boolean;
  /** Elements elsewhere on the page an item can be dropped onto (e.g. album cards). */
  dropTargets?: string;
  /** Called instead of onMove when an item is dropped onto one of the drop targets. */
  onDropTarget?: (from: number, target: HTMLElement) => void;
};

export function sortable({ container, items, handle, onMove, grid = false, dropTargets, onDropTarget }: Options): () => void {
  let from = -1;
  let to = -1;
  let ghost: HTMLElement | null = null;
  let dragged: HTMLElement | null = null;
  let offset = { x: 0, y: 0 };
  let into: HTMLElement | null = null; // a drop target under the pointer

  // Only the container's own items: lists inside lists (resume entries) sort separately.
  const list = () => [...container.querySelectorAll<HTMLElement>(`:scope > ${items}`)];
  const clearMarks = () => list().forEach((el) => el.classList.remove('drop-before', 'drop-after', 'dragging'));

  const targetAt = (x: number, y: number) => {
    const els = list();
    for (let i = 0; i < els.length; i++) {
      const r = els[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        const after = grid ? x > r.left + r.width / 2 : y > r.top + r.height / 2;
        return { i, el: els[i], after };
      }
    }
    return null;
  };

  const onDown = (e: PointerEvent) => {
    const h = (e.target as HTMLElement).closest<HTMLElement>(handle);
    if (!h || !container.contains(h) || e.button > 0) return;
    const item = h.closest<HTMLElement>(items);
    if (!item) return;
    e.preventDefault();
    from = list().indexOf(item);
    to = from;
    dragged = item;
    const r = item.getBoundingClientRect();
    offset = { x: e.clientX - r.left, y: e.clientY - r.top };
    // A see-through copy follows the pointer while the original stays in place, faded.
    ghost = item.cloneNode(true) as HTMLElement;
    ghost.classList.add('drag-ghost');
    Object.assign(ghost.style, { width: `${r.width}px`, height: `${r.height}px`, left: `${r.left}px`, top: `${r.top}px` });
    document.body.append(ghost);
    item.classList.add('dragging');
    h.setPointerCapture(e.pointerId);
    h.addEventListener('pointermove', onMoveEvt);
    h.addEventListener('pointerup', onUp, { once: true });
    h.addEventListener('pointercancel', onUp, { once: true });
  };

  const onMoveEvt = (e: PointerEvent) => {
    if (!ghost) return;
    ghost.style.left = `${e.clientX - offset.x}px`;
    ghost.style.top = `${e.clientY - offset.y}px`;
    // Scroll the page when dragging near the top or bottom edge.
    if (e.clientY < 70) scrollBy(0, -12);
    else if (e.clientY > innerHeight - 70) scrollBy(0, 12);
    list().forEach((el) => el.classList.remove('drop-before', 'drop-after'));
    // Over a drop target elsewhere (the ghost lets the pointer "see through" it)?
    into?.classList.remove('drop-into');
    into = dropTargets ? (document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(dropTargets) ?? null) : null;
    if (into && !container.contains(into)) {
      into.classList.add('drop-into');
      to = from;
      return;
    }
    into = null;
    const t = targetAt(e.clientX, e.clientY);
    if (!t || t.el === dragged) {
      to = t ? from : to;
      return;
    }
    t.el.classList.add(t.after ? 'drop-after' : 'drop-before');
    let idx = t.after ? t.i + 1 : t.i;
    if (idx > from) idx -= 1; // the dragged item leaves its old place first
    to = idx;
  };

  const onUp = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).removeEventListener('pointermove', onMoveEvt);
    ghost?.remove();
    ghost = null;
    dragged = null;
    clearMarks();
    if (into && onDropTarget && from > -1) {
      into.classList.remove('drop-into');
      onDropTarget(from, into);
    } else if (from > -1 && to > -1 && to !== from) onMove(from, to);
    into = null;
    from = to = -1;
  };

  // Keyboard: arrow keys on a focused handle move its item one place.
  const onKey = (e: KeyboardEvent) => {
    const h = (e.target as HTMLElement).closest<HTMLElement>(handle);
    if (!h || !container.contains(h)) return;
    const back = e.key === 'ArrowUp' || (grid && e.key === 'ArrowLeft');
    const fwd = e.key === 'ArrowDown' || (grid && e.key === 'ArrowRight');
    if (!back && !fwd) return;
    e.preventDefault();
    const els = list();
    const i = els.indexOf(h.closest<HTMLElement>(items)!);
    const j = i + (fwd ? 1 : -1);
    if (i < 0 || j < 0 || j >= els.length) return;
    onMove(i, j);
    // Keep focus on the same item's handle after the screen redraws.
    requestAnimationFrame(() => list()[j]?.querySelector<HTMLElement>(handle)?.focus());
  };

  container.addEventListener('pointerdown', onDown);
  container.addEventListener('keydown', onKey);
  return () => {
    container.removeEventListener('pointerdown', onDown);
    container.removeEventListener('keydown', onKey);
  };
}

/** Moves one entry of an array from one position to another (in place). */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
  return arr;
}
