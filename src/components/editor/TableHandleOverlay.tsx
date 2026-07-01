"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Editor } from "@tiptap/react";
import { columnResizingPluginKey } from "@tiptap/pm/tables";
import { Move } from "lucide-react";
import { resizeFromLeftEdge } from "@/lib/tiptap/tableColwidth";
import {
  applyTableLeftEdge,
  moveTableToIndex,
} from "@/lib/tiptap/tableCommands";
import { targetIndexFromY } from "@/lib/tiptap/tableMoveMath";
import { selectWholeTable } from "@/lib/tiptap/tableProperties";

// ── Word-style table handle overlay ─────────────────────────────────────────
//
// A React layer (PageChromeLayer pattern) drawing handles around the table that
// holds the selection: a LEFT-edge grip (Word left-edge drag = indent + width,
// prosemirror-tables can't do this) and a top-left MOVE/SELECT handle (click =
// select whole table, drag = reorder among sibling blocks). The right edge and
// inter-column boundaries stay with prosemirror's own column-resize plugin.
//
// It lives inside #editor-main, a stacking sibling BELOW the sticky ruler, so a
// table scrolled under the ruler is simply hidden (Word-correct) and no handle
// ever paints over the ruler.

/** Must match `Table.configure({ cellMinWidth })` in VisualEditor.tsx. */
const CELL_MIN_WIDTH = 28;
/** px the pointer must travel on the move handle before it counts as a drag. */
const MOVE_DRAG_THRESHOLD_PX = 4;
/** Width of the left-edge grab strip. */
const EDGE_GRIP_PX = 8;

interface Props {
  editor: Editor | null;
  pagesRootRef: RefObject<HTMLElement | null>;
  scrollContainerRef: RefObject<HTMLElement | null>;
}

interface ActiveTable {
  pos: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Doc position before the table holding the selection, or null. */
function activeTablePos(editor: Editor): number | null {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === "table") return $from.before(d);
  }
  return null;
}

/** The live `<table>` element for a table node position. */
function tableElAt(editor: Editor, pos: number): HTMLElement | null {
  const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
  if (!dom) return null;
  if (dom.tagName === "TABLE") return dom;
  return (dom.querySelector?.("table") as HTMLElement | null) ?? null;
}

/** Rendered per-column pixel widths from the table DOM (expanding colspan). */
function renderedColumnWidths(tableEl: HTMLElement): number[] {
  const firstRow = tableEl.querySelector("tr");
  if (!firstRow) return [];
  const widths: number[] = [];
  Array.from(firstRow.children)
    .filter((c) => c.tagName === "TD" || c.tagName === "TH")
    .forEach((cell) => {
      const colspan = Math.max(
        1,
        parseInt(cell.getAttribute("colspan") ?? "1", 10) || 1
      );
      const per = cell.getBoundingClientRect().width / colspan;
      for (let i = 0; i < colspan; i++) widths.push(Math.round(per));
    });
  return widths;
}

export function TableHandleOverlay({
  editor,
  pagesRootRef,
  scrollContainerRef,
}: Props) {
  const [active, setActive] = useState<ActiveTable | null>(null);
  // Live grip offset (px) while dragging the left edge; null when not dragging.
  const [previewDeltaPx, setPreviewDeltaPx] = useState<number | null>(null);
  const draggingRef = useRef(false);

  const measure = useCallback(() => {
    if (!editor || editor.isDestroyed || !editor.isEditable) {
      setActive(null);
      return;
    }
    const pagesRoot = pagesRootRef.current;
    if (!pagesRoot) {
      setActive(null);
      return;
    }
    // Hide while prosemirror is resizing a column (avoid double-drag).
    const colState = columnResizingPluginKey.getState(editor.state) as
      | { dragging?: unknown }
      | undefined;
    if (colState?.dragging) return;

    const pos = activeTablePos(editor);
    if (pos == null) {
      setActive(null);
      return;
    }
    const tableEl = tableElAt(editor, pos);
    if (!tableEl) {
      setActive(null);
      return;
    }
    const anchor = pagesRoot.getBoundingClientRect();
    const rect = tableEl.getBoundingClientRect();
    setActive({
      pos,
      top: rect.top - anchor.top,
      left: rect.left - anchor.left,
      width: rect.width,
      height: rect.height,
    });
  }, [editor, pagesRootRef]);

  // Re-measure on editor changes.
  useEffect(() => {
    if (!editor) return;
    const onChange = () => {
      if (!draggingRef.current) measure();
    };
    editor.on("transaction", onChange);
    editor.on("selectionUpdate", onChange);
    editor.on("focus", onChange);
    return () => {
      editor.off("transaction", onChange);
      editor.off("selectionUpdate", onChange);
      editor.off("focus", onChange);
    };
  }, [editor, measure]);

  // Re-measure on layout / scroll / resize. The initial measure is scheduled in
  // a frame (not called synchronously) so the effect never runs setState during
  // its own execution — the measurement still lands before paint is perceptible.
  useLayoutEffect(() => {
    const initRaf = requestAnimationFrame(() => measure());
    const pagesRoot = pagesRootRef.current;
    const scrollEl = scrollContainerRef.current;

    let ro: ResizeObserver | null = null;
    if (pagesRoot) {
      ro = new ResizeObserver(() => {
        if (!draggingRef.current) measure();
      });
      ro.observe(pagesRoot);
      if (scrollEl) ro.observe(scrollEl);
    }

    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        if (!draggingRef.current) measure();
      });
    };
    scrollEl?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(initRaf);
      ro?.disconnect();
      scrollEl?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
    };
  }, [measure, pagesRootRef, scrollContainerRef]);

  const startLeftEdgeDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!editor || !active || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const pos = active.pos;
      const table = editor.state.doc.nodeAt(pos);
      const tableEl = tableElAt(editor, pos);
      if (!table || !tableEl) return;
      const widths = renderedColumnWidths(tableEl);
      if (widths.length === 0) return;
      const startIndent = (table.attrs.tableIndent as number | null) ?? 0;
      const startX = e.clientX;
      draggingRef.current = true;
      document.body.classList.add("wh-table-edge-dragging");
      let last: ReturnType<typeof resizeFromLeftEdge> = null;

      const onMove = (ev: MouseEvent) => {
        const res = resizeFromLeftEdge(
          widths,
          ev.clientX - startX,
          CELL_MIN_WIDTH,
          startIndent,
          Infinity
        );
        if (!res) return;
        last = res;
        setPreviewDeltaPx(res.appliedDeltaPx);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.classList.remove("wh-table-edge-dragging");
        draggingRef.current = false;
        setPreviewDeltaPx(null);
        if (last) applyTableLeftEdge(editor, pos, last.widths, last.indentPx);
        else measure();
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [editor, active, measure]
  );

  const startMove = useCallback(
    (e: React.MouseEvent) => {
      if (!editor || !active || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const pos = active.pos;
      const startX = e.clientX;
      const startY = e.clientY;
      let didDrag = false;
      draggingRef.current = true;
      document.body.classList.add("wh-table-move-dragging");

      const onMove = (ev: MouseEvent) => {
        if (
          !didDrag &&
          Math.hypot(ev.clientX - startX, ev.clientY - startY) >
            MOVE_DRAG_THRESHOLD_PX
        ) {
          didDrag = true;
        }
      };
      const onUp = (ev: MouseEvent) => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.classList.remove("wh-table-move-dragging");
        draggingRef.current = false;

        if (!didDrag) {
          selectWholeTable(editor);
          measure();
          return;
        }
        // Drag → reorder among sibling blocks in the same page-body.
        const tableEl = tableElAt(editor, pos);
        const body = tableEl?.closest(".page-body");
        if (!body) {
          measure();
          return;
        }
        const siblings = Array.from(body.children) as HTMLElement[];
        const midpoints = siblings.map((el) => {
          const r = el.getBoundingClientRect();
          return r.top + r.height / 2;
        });
        const targetIndex = targetIndexFromY(ev.clientY, midpoints);
        moveTableToIndex(editor, pos, targetIndex);
        measure();
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [editor, active, measure]
  );

  if (!active) return null;

  const gripLeft = active.left + (previewDeltaPx ?? 0) - EDGE_GRIP_PX / 2;

  return (
    <div className="pointer-events-none absolute inset-0 z-[6]">
      {/* Left-edge grip (Word left-edge drag: indent + width). */}
      <div
        className="wh-table-edge pointer-events-auto absolute"
        style={{
          left: gripLeft,
          top: active.top,
          width: EDGE_GRIP_PX,
          height: active.height,
        }}
        onMouseDown={startLeftEdgeDrag}
        title="ลากขอบซ้ายของตาราง (Drag table left edge)"
      />
      {/* Move / select handle (click = select, drag = reorder). */}
      <button
        type="button"
        className="wh-table-move pointer-events-auto absolute flex items-center justify-center"
        style={{ left: active.left - 20, top: active.top - 20 }}
        onMouseDown={startMove}
        title="เลือก/ย้ายตาราง (Select or move table)"
        aria-label="เลือกหรือย้ายตาราง (Select or move table)"
      >
        <Move className="size-3" />
      </button>
    </div>
  );
}
