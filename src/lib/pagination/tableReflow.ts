import type { Node as PMNode } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";

/**
 * A3 (auto): split an over-tall table at row boundaries during holistic
 * repagination, mirroring the manual "แยกตารางข้ามหน้า" command
 * (`src/lib/tiptap/tableSplit.ts`): when the table has a header row, every
 * continuation piece repeats it.
 *
 * Pieces are marked via the row attribute `dataRepeatSource` (registered by
 * the `RepeatingRow` extension, serialized as `data-repeat-source`) so export
 * (`stripPaginationWrappers`) can re-join the pieces into one table and drop
 * the repeated header copies. The original document content is never lost:
 * every original row appears in exactly one piece.
 *
 * Guard rails:
 * - Fallback (`null`) when any single content row (plus table chrome and the
 *   repeated header) is taller than the page limit — the caller keeps the
 *   current whole-table behavior (own page via `atomicOversize`), so a giant
 *   row can never cause an infinite split loop.
 * - Every piece contains at least one content row (never an empty table).
 * - Fallback when DOM rows and ProseMirror rows cannot be matched 1:1.
 */

/** Marker on the repeated header-row copy inside a continuation piece. */
export const TABLE_SOFT_SPLIT_HEADER = "table-soft-split-header";
/** Marker on the first content row of a continuation piece (no header case). */
export const TABLE_SOFT_SPLIT_CONT = "table-soft-split";

export interface TableSplitPiece {
  node: PMNode;
  /** Estimated rendered height of this piece (px), incl. chrome + header copy. */
  height: number;
  /**
   * Range [startOffset, endOffset] in the ORIGINAL table's content covered by
   * this piece's original rows — used to map the caret into the right piece.
   */
  startOffset: number;
  endOffset: number;
  /** Caret shift inside the piece (size of the prepended header copy). */
  innerShift: number;
}

/** True when every cell of the row is a `tableHeader` cell. */
function isHeaderRow(row: PMNode): boolean {
  if (row.childCount === 0) return false;
  let all = true;
  row.forEach((cell) => {
    if (cell.type.name !== "tableHeader") all = false;
  });
  return all;
}

function withRowMarker(row: PMNode, marker: string): PMNode {
  // `dataRepeatSource` only exists when the RepeatingRow extension is
  // registered; ProseMirror silently ignores unknown attribute keys.
  return row.type.create(
    { ...row.attrs, dataRepeatSource: marker },
    row.content,
    row.marks
  );
}

/**
 * Split a too-tall table block into page-sized pieces at row boundaries.
 *
 * @param block            ProseMirror table node.
 * @param el               The measured DOM block (the table or its wrapper).
 * @param measuredHeightPx Rendered outer height of the whole table block.
 * @param limitPx          Page content height limit (px).
 * @returns Pieces (>= 2) or `null` to keep the current whole-table behavior.
 */
export function splitTableAtRowBoundaries(
  block: PMNode,
  el: Element,
  measuredHeightPx: number,
  limitPx: number
): TableSplitPiece[] | null {
  const tableEl =
    el.tagName === "TABLE" ? (el as HTMLTableElement) : el.querySelector("table");
  if (!tableEl) return null;

  const domRows = Array.from((tableEl as HTMLTableElement).rows);
  const nodeRows: PMNode[] = [];
  block.forEach((row) => nodeRows.push(row));

  // Need a 1:1 DOM↔PM row mapping and at least two rows to split between.
  if (nodeRows.length < 2 || domRows.length !== nodeRows.length) return null;

  const rowHeights = domRows.map((r) => r.getBoundingClientRect().height);
  const rowsTotal = rowHeights.reduce((a, b) => a + b, 0);
  if (rowsTotal <= 0) return null;

  // Non-row height (borders, margins, caption…), charged to every piece.
  const chrome = Math.max(0, measuredHeightPx - rowsTotal);

  // Mirror the manual split: repeat the header row on continuation pieces.
  const repeatHeader = isHeaderRow(nodeRows[0]);
  const headerH = repeatHeader ? rowHeights[0] : 0;
  const contentStart = repeatHeader ? 1 : 0;

  // Need at least two content rows so each piece keeps >= 1 content row.
  if (nodeRows.length - contentStart < 2) return null;

  // Guard rail: a single content row that can never fit a page (even alone
  // with the repeated header) → whole-table fallback, no infinite loop.
  for (let r = contentStart; r < nodeRows.length; r++) {
    if (chrome + headerH + rowHeights[r] > limitPx) return null;
  }

  // Greedy fill-to-limit over content rows (same spirit as computePageBreaks).
  const segments: Array<{ from: number; to: number; height: number }> = [];
  let segFrom = contentStart;
  let acc = chrome + headerH;
  for (let r = contentStart; r < nodeRows.length; r++) {
    const h = rowHeights[r];
    if (acc + h > limitPx && r > segFrom) {
      segments.push({ from: segFrom, to: r, height: acc });
      segFrom = r;
      acc = chrome + headerH;
    }
    acc += h;
  }
  segments.push({ from: segFrom, to: nodeRows.length, height: acc });

  // Row-sum estimate says it fits after all → leave the table untouched.
  if (segments.length < 2) return null;

  // Content offsets of each original row inside the table node.
  const rowOffsets: number[] = [];
  {
    let o = 0;
    for (const row of nodeRows) {
      rowOffsets.push(o);
      o += row.nodeSize;
    }
    rowOffsets.push(o);
  }

  const headerRow = nodeRows[0];
  const pieces: TableSplitPiece[] = [];

  segments.forEach((seg, idx) => {
    const rows: PMNode[] = [];
    let innerShift = 0;

    if (idx === 0) {
      if (repeatHeader) rows.push(headerRow);
    } else if (repeatHeader) {
      const copy = withRowMarker(headerRow, TABLE_SOFT_SPLIT_HEADER);
      rows.push(copy);
      innerShift = copy.nodeSize;
    }

    for (let r = seg.from; r < seg.to; r++) {
      let row = nodeRows[r];
      if (idx > 0 && !repeatHeader && r === seg.from) {
        row = withRowMarker(row, TABLE_SOFT_SPLIT_CONT);
      }
      rows.push(row);
    }

    pieces.push({
      node: block.type.create(block.attrs, Fragment.fromArray(rows)),
      height: seg.height,
      // Piece 0 also covers the original header row for caret mapping.
      startOffset: idx === 0 ? 0 : rowOffsets[seg.from],
      endOffset: rowOffsets[seg.to],
      innerShift,
    });
  });

  return pieces;
}
