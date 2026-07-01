"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Editor } from "@tiptap/react";
import { resizeColumnBoundary } from "@/lib/tiptap/tableColwidth";
import { setColumnWidths } from "@/lib/tiptap/tableCommands";

// ── Word-style column-boundary markers on the horizontal ruler (Phase 3) ─────
//
// When the caret is inside a table, small markers appear on the ruler at each
// inter-column boundary; dragging one resizes that boundary (grows the left
// column, shrinks the right) via the same `colwidth` write-back the in-table
// resize and export use.
//
// This is a self-contained overlay rendered inside the ruler track's coordinate
// space (its left:0 == the paper's left edge, 1:1 page px), so it needs NO
// changes to the fragile shared Ruler/useRulerDrag code. Boundary x-positions
// are MEASURED from the live cell rects (exact regardless of borders/indent).

/** Must match `Table.configure({ cellMinWidth })` in VisualEditor.tsx. */
const CELL_MIN_WIDTH = 28;

interface Props {
  editor: Editor | null;
  scrollContainerRef: RefObject<HTMLElement | null>;
}

interface ColumnModel {
  tablePos: number;
  /** Inter-column boundary x-positions in page px (paper left = 0). */
  boundaries: number[];
  /** Rendered per-column widths (px), colspan-free. */
  widths: number[];
}

function activeTablePos(editor: Editor): number | null {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === "table") return $from.before(d);
  }
  return null;
}

function measure(editor: Editor): ColumnModel | null {
  const pos = activeTablePos(editor);
  if (pos == null) return null;
  const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
  const tableEl =
    dom?.tagName === "TABLE"
      ? dom
      : (dom?.querySelector?.("table") as HTMLElement | null);
  if (!tableEl) return null;
  const pageNode = tableEl.closest(".page-node") as HTMLElement | null;
  if (!pageNode) return null;

  const firstRow = tableEl.querySelector("tr");
  if (!firstRow) return null;
  const cells = Array.from(firstRow.children).filter(
    (c) => c.tagName === "TD" || c.tagName === "TH"
  ) as HTMLElement[];
  // Merged first-row cells make per-column boundaries ambiguous — skip markers.
  if (cells.some((c) => (parseInt(c.getAttribute("colspan") ?? "1", 10) || 1) > 1)) {
    return null;
  }
  if (cells.length < 2) return null;

  const pageLeft = pageNode.getBoundingClientRect().left;
  const widths: number[] = [];
  const boundaries: number[] = [];
  cells.forEach((cell, i) => {
    const r = cell.getBoundingClientRect();
    widths.push(Math.round(r.width));
    if (i < cells.length - 1) boundaries.push(Math.round(r.right - pageLeft));
  });
  return { tablePos: pos, boundaries, widths };
}

export function RulerColumnMarkers({ editor, scrollContainerRef }: Props) {
  const [model, setModel] = useState<ColumnModel | null>(null);
  const [dragPreview, setDragPreview] = useState<{ index: number; x: number } | null>(
    null
  );
  const draggingRef = useRef(false);
  // Teardown for the in-flight drag, so unmount mid-drag can't leak window
  // listeners, leave the body class stuck, or dispatch on a torn-down editor.
  const activeTeardownRef = useRef<(() => void) | null>(null);

  const remeasure = useCallback(() => {
    if (!editor || editor.isDestroyed || !editor.isEditable) {
      setModel(null);
      return;
    }
    setModel(measure(editor));
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const onChange = () => {
      if (!draggingRef.current) remeasure();
    };
    editor.on("transaction", onChange);
    editor.on("selectionUpdate", onChange);
    editor.on("focus", onChange);
    return () => {
      editor.off("transaction", onChange);
      editor.off("selectionUpdate", onChange);
      editor.off("focus", onChange);
    };
  }, [editor, remeasure]);

  useEffect(() => {
    const initRaf = requestAnimationFrame(() => remeasure());
    const scrollEl = scrollContainerRef.current;
    let raf = 0;
    const onScrollOrResize = () => {
      if (raf || draggingRef.current) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        remeasure();
      });
    };
    scrollEl?.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      cancelAnimationFrame(initRaf);
      if (raf) cancelAnimationFrame(raf);
      scrollEl?.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [remeasure, scrollContainerRef]);

  const startDrag = useCallback(
    (index: number) => (e: React.MouseEvent) => {
      if (!editor || !model || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startBoundary = model.boundaries[index];
      const { tablePos, widths } = model;
      draggingRef.current = true;
      document.body.classList.add("wh-table-edge-dragging");
      let committedWidths: number[] | null = null;

      const teardown = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.classList.remove("wh-table-edge-dragging");
        draggingRef.current = false;
        activeTeardownRef.current = null;
      };
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const next = resizeColumnBoundary(widths, index, delta, CELL_MIN_WIDTH);
        if (!next) return;
        committedWidths = next;
        // Preview: shift the marker by the clamped delta actually applied.
        const applied = next[index] - widths[index];
        setDragPreview({ index, x: startBoundary + applied });
      };
      const onUp = () => {
        teardown();
        setDragPreview(null);
        if (editor.isDestroyed) return;
        if (committedWidths) setColumnWidths(editor, tablePos, committedWidths);
        else remeasure();
      };
      activeTeardownRef.current = teardown;
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [editor, model, remeasure]
  );

  // Tear down any in-flight drag if the markers unmount mid-drag.
  useEffect(() => () => activeTeardownRef.current?.(), []);

  if (!model) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {model.boundaries.map((bx, i) => {
        const x = dragPreview?.index === i ? dragPreview.x : bx;
        return (
          <div
            key={i}
            className="wh-ruler-col-marker pointer-events-auto absolute"
            style={{ left: x - 4, top: 2 }}
            onMouseDown={startDrag(i)}
            title="ลากเพื่อปรับความกว้างคอลัมน์ (Drag to resize column)"
          />
        );
      })}
    </div>
  );
}
