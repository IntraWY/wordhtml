import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { TableMap } from "@tiptap/pm/tables";

// ── Document write-back for the Word-style table overlay ─────────────────────
//
// Plain functions (like `selectWholeTable` in tableProperties.ts) that the
// TableHandleOverlay / ruler markers call to commit a drag gesture in ONE
// transaction (single undo step). Column widths are written to the durable
// per-cell `colwidth` attr exactly as prosemirror-tables does, so
// `bakeTableColumns` export keeps working; the left-edge indent is written to
// the `tableIndent` attr (see tableProperties).

/**
 * Write per-column widths onto every cell's `colwidth` (expanding colspan) into
 * the given transaction. Attr-only change → cell positions are unchanged, so it
 * is safe to read positions from `state.doc`. Returns false if the table is empty.
 */
function writeColwidths(
  tr: Transaction,
  table: PMNode,
  tablePos: number,
  widths: number[]
): boolean {
  const map = TableMap.get(table);
  if (map.width === 0 || map.height === 0) return false;
  const start = tablePos + 1; // colwidth positions are table-content-relative
  const seen = new Set<number>();
  for (const cellRel of map.map) {
    if (seen.has(cellRel)) continue;
    seen.add(cellRel);
    const rect = map.findCell(cellRel);
    const span = rect.right - rect.left;
    const newColwidth: number[] = [];
    for (let i = 0; i < span; i++) {
      const w = widths[rect.left + i];
      newColwidth.push(typeof w === "number" && w > 0 ? Math.round(w) : 0);
    }
    const cellPos = start + cellRel;
    const cell = tr.doc.nodeAt(cellPos);
    if (!cell) continue;
    tr.setNodeMarkup(cellPos, undefined, { ...cell.attrs, colwidth: newColwidth });
  }
  return true;
}

/**
 * Apply a Word left-edge resize: set every column's width (via each cell's
 * `colwidth`) AND the table's `tableIndent`, in a single transaction.
 *
 * @param widths  per-column pixel widths (length = number of columns)
 * @param indentPx table left indent in px (0/negative clears it)
 */
export function applyTableLeftEdge(
  editor: Editor,
  tablePos: number,
  widths: number[],
  indentPx: number
): boolean {
  const { state } = editor;
  const table = state.doc.nodeAt(tablePos);
  if (!table || table.type.name !== "table") return false;

  const tr = state.tr;
  if (!writeColwidths(tr, table, tablePos, widths)) return false;
  const normalizedIndent = indentPx > 0 ? Math.round(indentPx) : null;
  tr.setNodeMarkup(tablePos, undefined, { ...table.attrs, tableIndent: normalizedIndent });

  editor.view.dispatch(tr);
  return true;
}

/**
 * Set every column's width (via each cell's `colwidth`) without touching the
 * table indent — used by the ruler column markers (Word Phase 3). One
 * transaction so it is a single undo step.
 */
export function setColumnWidths(
  editor: Editor,
  tablePos: number,
  widths: number[]
): boolean {
  const { state } = editor;
  const table = state.doc.nodeAt(tablePos);
  if (!table || table.type.name !== "table") return false;

  const tr = state.tr;
  if (!writeColwidths(tr, table, tablePos, widths)) return false;
  editor.view.dispatch(tr);
  return true;
}

/**
 * Reorder a table among its sibling blocks (Word's table move handle — the block
 * model has no free position, so this is a discrete reorder, not a free float).
 * `targetIndex` is an index among the current siblings (see `targetIndexFromY`).
 * No-op when the drop lands on the table's own slot.
 */
export function moveTableToIndex(
  editor: Editor,
  tablePos: number,
  targetIndex: number
): boolean {
  const { state } = editor;
  const $pos = state.doc.resolve(tablePos);
  const table = state.doc.nodeAt(tablePos);
  if (!table || table.type.name !== "table") return false;

  const parent = $pos.parent;
  const currentIndex = $pos.index();
  // Dropping just before or just after its own position is a no-op.
  if (targetIndex === currentIndex || targetIndex === currentIndex + 1) return false;
  if (targetIndex < 0 || targetIndex > parent.childCount) return false;

  const parentStart = $pos.start();
  let insertPos = parentStart;
  for (let i = 0; i < targetIndex; i++) insertPos += parent.child(i).nodeSize;

  const tr = state.tr;
  tr.delete(tablePos, tablePos + table.nodeSize);
  const mapped = tr.mapping.map(insertPos);
  tr.insert(mapped, table.copy(table.content));
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}
