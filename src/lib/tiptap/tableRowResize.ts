import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { computeRowHeight, MIN_ROW_PX } from "./rowResizeMath";

// ── Word-style row-height dragging ──────────────────────────────────────────
//
// prosemirror-tables ships only *column* resizing, so dragging a row's bottom
// border to make it taller/shorter is implemented here. Like the built-in
// column resize, this hit-tests a thin band around each row's bottom edge rather
// than injecting a DOM handle into the <tr> (a <tr> can't host a non-cell child).
//
// While hovering the band the editor shows a `row-resize` cursor; on drag we set
// the live <tr> `height` inline for instant preview and commit the final value
// to the existing `rowHeight` attr (see tableProperties.ts) in ONE transaction
// on mouseup — so it is a single undo step and needs no export changes.
//
// The document model is untouched apart from that one attr; pagination reflow
// keeps working because `rowHeight` is a *minimum* (rows still grow with content).

export const tableRowResizePluginKey = new PluginKey("tableRowResize");

/** Vertical hit-zone (px) on each side of a row's bottom border. */
const GRAB_PX = 5;

const HOT_CLASS = "wh-row-resize-hot";
const DRAGGING_CLASS = "wh-row-resizing";

/** Px the pointer must travel before a mousedown counts as a resize (not a click). */
const DRAG_THRESHOLD_PX = 3;

/** Resolve the doc position BEFORE the `tableRow` that owns a `<tr>` element. */
function rowPosFromDom(view: EditorView, tr: HTMLTableRowElement): number | null {
  let pos: number;
  try {
    pos = view.posAtDOM(tr, 0);
  } catch {
    return null;
  }
  const $pos = view.state.doc.resolve(pos);
  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type.name === "tableRow") return $pos.before(d);
  }
  return null;
}

/** The `<tr>` whose bottom border is within GRAB_PX of the pointer, or null. */
function rowUnderPointer(
  event: MouseEvent
): HTMLTableRowElement | null {
  const target = event.target as HTMLElement | null;
  if (!target || !target.closest("table")) return null;
  const tr = target.closest("tr") as HTMLTableRowElement | null;
  if (!tr) return null;
  const rect = tr.getBoundingClientRect();
  const nearBottom = Math.abs(event.clientY - rect.bottom) <= GRAB_PX;
  const withinX = event.clientX >= rect.left && event.clientX <= rect.right;
  return nearBottom && withinX ? tr : null;
}

interface DragState {
  rowEl: HTMLTableRowElement;
  startHeight: number;
  startX: number;
  startY: number;
  /** Set once the pointer travels past DRAG_THRESHOLD_PX — a real resize. */
  moved: boolean;
}

export function createTableRowResizePlugin(): Plugin {
  let hot = false;
  let drag: DragState | null = null;
  let raf = 0;
  let pendingHeight = 0;
  // Teardown for the in-flight drag's window listeners, so the plugin's own
  // destroy() can tear a drag down if the view unmounts mid-drag (otherwise the
  // listeners leak and mouseup dispatches on a destroyed view).
  let activeCleanup: (() => void) | null = null;

  const hasRaf = typeof requestAnimationFrame === "function";

  const setHot = (view: EditorView, next: boolean) => {
    if (next === hot) return;
    hot = next;
    view.dom.classList.toggle(HOT_CLASS, next);
  };

  const applyPreview = () => {
    raf = 0;
    if (drag) drag.rowEl.style.height = `${pendingHeight}px`;
  };

  return new Plugin({
    key: tableRowResizePluginKey,
    props: {
      handleDOMEvents: {
        mousemove(view, event) {
          if (drag) return false; // window listener owns the drag
          setHot(view, rowUnderPointer(event) !== null);
          return false;
        },
        mouseleave(view) {
          if (!drag) setHot(view, false);
          return false;
        },
        mousedown(view, event) {
          if (event.button !== 0) return false;
          const rowEl = rowUnderPointer(event);
          if (!rowEl) return false;
          // Bail if we can't resolve the row — let ProseMirror handle the click.
          if (rowPosFromDom(view, rowEl) == null) return false;

          event.preventDefault();
          drag = {
            rowEl,
            startHeight: rowEl.getBoundingClientRect().height,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
          };
          pendingHeight = drag.startHeight;
          document.body.classList.add(DRAGGING_CLASS);

          const cleanup = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            document.body.classList.remove(DRAGGING_CLASS);
            if (raf && typeof cancelAnimationFrame === "function") {
              cancelAnimationFrame(raf);
              raf = 0;
            }
            activeCleanup = null;
          };

          const onMove = (e: MouseEvent) => {
            if (!drag) return;
            const dy = e.clientY - drag.startY;
            if (!drag.moved && Math.abs(dy) >= DRAG_THRESHOLD_PX) {
              drag.moved = true;
            }
            if (!drag.moved) return; // ignore sub-threshold jitter (it's a click)
            pendingHeight = computeRowHeight(drag.startHeight, dy, MIN_ROW_PX);
            if (hasRaf) {
              if (!raf) raf = requestAnimationFrame(applyPreview);
            } else {
              applyPreview();
            }
          };

          const onUp = () => {
            const current = drag;
            drag = null;
            cleanup();
            if (!current) return;
            // Drop the inline preview; the committed attr re-renders it.
            current.rowEl.style.removeProperty("height");

            // A click without a real drag (mousedown was prevented): place the
            // caret where the user clicked — never mutate rowHeight.
            if (!current.moved) {
              const coords = view.posAtCoords({
                left: current.startX,
                top: current.startY,
              });
              if (coords) {
                const sel = TextSelection.near(
                  view.state.doc.resolve(coords.pos)
                );
                view.dispatch(view.state.tr.setSelection(sel));
              }
              view.focus();
              return;
            }

            // Re-resolve the row position at commit time so a reflow during the
            // drag (pagination / repaginate) can't write to a stale/wrong row.
            const rowPos = rowPosFromDom(view, current.rowEl);
            if (rowPos == null) return;
            const node = view.state.doc.nodeAt(rowPos);
            if (!node || node.type.name !== "tableRow") return;
            if (pendingHeight === (node.attrs.rowHeight ?? 0)) return;
            view.dispatch(
              view.state.tr.setNodeMarkup(rowPos, undefined, {
                ...node.attrs,
                rowHeight: pendingHeight,
              })
            );
          };

          activeCleanup = cleanup;
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
          return true;
        },
      },
    },
    view() {
      return {
        destroy() {
          drag = null;
          activeCleanup?.(); // tear down an in-flight drag on unmount
          if (raf && typeof cancelAnimationFrame === "function") {
            cancelAnimationFrame(raf);
            raf = 0;
          }
          document.body.classList.remove(DRAGGING_CLASS);
        },
      };
    },
  });
}

/**
 * Tiptap extension registering the row-height drag plugin. Kept separate from
 * `TablePropertiesExtension` (which owns the numeric dialog + managed styles) so
 * each file has one clear job.
 */
export const TableRowResize = Extension.create({
  name: "tableRowResize",
  addProseMirrorPlugins() {
    return [createTableRowResizePlugin()];
  },
});
