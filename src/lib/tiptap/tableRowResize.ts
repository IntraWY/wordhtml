import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
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
  rowPos: number;
  tr: HTMLTableRowElement;
  startHeight: number;
  startY: number;
}

export function createTableRowResizePlugin(): Plugin {
  let hot = false;
  let drag: DragState | null = null;
  let raf = 0;
  let pendingHeight = 0;

  const hasRaf = typeof requestAnimationFrame === "function";

  const setHot = (view: EditorView, next: boolean) => {
    if (next === hot) return;
    hot = next;
    view.dom.classList.toggle(HOT_CLASS, next);
  };

  const applyPreview = () => {
    raf = 0;
    if (drag) drag.tr.style.height = `${pendingHeight}px`;
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
          const tr = rowUnderPointer(event);
          if (!tr) return false;
          const rowPos = rowPosFromDom(view, tr);
          if (rowPos == null) return false;

          event.preventDefault();
          drag = {
            rowPos,
            tr,
            startHeight: tr.getBoundingClientRect().height,
            startY: event.clientY,
          };
          pendingHeight = drag.startHeight;
          document.body.classList.add(DRAGGING_CLASS);

          const onMove = (e: MouseEvent) => {
            if (!drag) return;
            pendingHeight = computeRowHeight(
              drag.startHeight,
              e.clientY - drag.startY,
              MIN_ROW_PX
            );
            if (hasRaf) {
              if (!raf) raf = requestAnimationFrame(applyPreview);
            } else {
              applyPreview();
            }
          };

          const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            document.body.classList.remove(DRAGGING_CLASS);
            if (raf && typeof cancelAnimationFrame === "function") {
              cancelAnimationFrame(raf);
              raf = 0;
            }
            const current = drag;
            drag = null;
            if (!current) return;
            // Drop the inline preview; the committed attr re-renders it.
            current.tr.style.removeProperty("height");
            const node = view.state.doc.nodeAt(current.rowPos);
            if (!node || node.type.name !== "tableRow") return;
            if (pendingHeight === (node.attrs.rowHeight ?? 0)) return;
            const tr = view.state.tr.setNodeMarkup(current.rowPos, undefined, {
              ...node.attrs,
              rowHeight: pendingHeight,
            });
            view.dispatch(tr);
          };

          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
          return true;
        },
      },
    },
    view() {
      return {
        destroy() {
          if (raf && typeof cancelAnimationFrame === "function") {
            cancelAnimationFrame(raf);
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
