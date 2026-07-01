import type { Node as PMNode } from "@tiptap/pm/model";

// ── Pure column-width math for the Word-style table overlay ──────────────────
//
// Column widths live on each cell as the prosemirror-tables `colwidth` attr
// (an array of numbers/null, one per spanned column). `readColumnWidths` mirrors
// `bakeTableColumns.columnWidths` (export path) but reads the live PM node, so
// the overlay and the export agree on what the widths are.
//
// `resizeFromLeftEdge` implements Word's left-edge drag: the RIGHT edge stays
// fixed, the left edge moves in → the table gains left indent AND the first
// column narrows by the same amount. All clamping (first column ≥ cellMinWidth,
// indent within [0, maxIndent]) is done here so it is trivially unit-tested with
// no DOM/PM.

/**
 * Per-column pixel widths from the first row of a table node (expanding colspan,
 * reading each cell's `colwidth` array). `null` where a width is unknown.
 * Returns `null` when the table has no row.
 */
export function readColumnWidths(tableNode: PMNode): (number | null)[] | null {
  const firstRow = tableNode.firstChild;
  if (!firstRow) return null;
  const widths: (number | null)[] = [];
  firstRow.forEach((cell) => {
    const colspan = Math.max(1, Number(cell.attrs.colspan ?? 1) || 1);
    const colwidth = cell.attrs.colwidth as (number | null)[] | null | undefined;
    for (let i = 0; i < colspan; i++) {
      const w = colwidth?.[i];
      widths.push(typeof w === "number" && Number.isFinite(w) && w > 0 ? w : null);
    }
  });
  return widths;
}

export interface LeftEdgeResizeResult {
  /** New per-column widths (integers). First column absorbs the change. */
  widths: number[];
  /** New table indent in px (clamped to [0, maxIndent]). */
  indentPx: number;
  /** Signed px actually applied to the left edge (after all clamping). */
  appliedDeltaPx: number;
}

/**
 * Word left-edge drag. `deltaPx > 0` = drag right (table shifts right, first
 * column shrinks, right edge fixed); `deltaPx < 0` = drag left (indent shrinks,
 * first column grows). Requires every column width to be known.
 *
 * @param widths          current per-column widths (must all be numbers)
 * @param deltaPx         raw pointer delta on the left edge
 * @param cellMinWidth    floor for the first column (prosemirror `cellMinWidth`)
 * @param currentIndentPx current table indent (margin-left)
 * @param maxIndentPx     upper clamp for indent (keep table on the page); use
 *                        Infinity for no upper bound
 */
export function resizeFromLeftEdge(
  widths: readonly (number | null)[],
  deltaPx: number,
  cellMinWidth: number,
  currentIndentPx: number,
  maxIndentPx: number
): LeftEdgeResizeResult | null {
  if (widths.length === 0) return null;
  const nums = widths.map((w) => (typeof w === "number" ? w : NaN));
  if (nums.some((w) => !Number.isFinite(w))) return null; // need all known
  const first = nums[0];

  let d = Number.isFinite(deltaPx) ? deltaPx : 0;
  // Upper: shrinking the first column can't take it below cellMinWidth.
  d = Math.min(d, first - cellMinWidth);
  // Indent lower bound (>= 0) and upper bound (<= maxIndent).
  let newIndent = currentIndentPx + d;
  if (newIndent < 0) {
    d -= newIndent; // pull d up so indent lands exactly on 0
    newIndent = 0;
  }
  if (Number.isFinite(maxIndentPx) && newIndent > maxIndentPx) {
    d -= newIndent - maxIndentPx; // pull d down so indent lands on max
    newIndent = maxIndentPx;
  }

  const out = nums.slice();
  out[0] = first - d;
  return {
    widths: out.map((w) => Math.round(w)),
    indentPx: Math.round(newIndent),
    appliedDeltaPx: d,
  };
}

/**
 * Resize an inter-column boundary (Word's ruler column markers). Boundary
 * `boundaryIndex` sits between column `boundaryIndex` and `boundaryIndex + 1`;
 * dragging it right (`deltaPx > 0`) grows the left column and shrinks the right,
 * keeping the table's overall width and every other column fixed. Both affected
 * columns are clamped to `cellMinWidth`. Requires known widths for the pair.
 * Returns the new widths, or null if the input is invalid.
 */
export function resizeColumnBoundary(
  widths: readonly (number | null)[],
  boundaryIndex: number,
  deltaPx: number,
  cellMinWidth: number
): number[] | null {
  if (boundaryIndex < 0 || boundaryIndex >= widths.length - 1) return null;
  const left = widths[boundaryIndex];
  const right = widths[boundaryIndex + 1];
  if (typeof left !== "number" || typeof right !== "number") return null;

  let d = Number.isFinite(deltaPx) ? deltaPx : 0;
  d = Math.max(-(left - cellMinWidth), Math.min(d, right - cellMinWidth));

  const out = widths.map((w) => (typeof w === "number" ? Math.round(w) : 0));
  out[boundaryIndex] = Math.round(left + d);
  out[boundaryIndex + 1] = Math.round(right - d);
  return out;
}
