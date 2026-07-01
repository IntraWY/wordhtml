/**
 * Pure math for Word-style row-height dragging (the horizontal-border drag that
 * prosemirror-tables does not provide). No DOM, no ProseMirror — unit-tested in
 * `rowResizeMath.test.ts`.
 *
 * The value produced is written to the existing `rowHeight` attr on `tableRow`
 * (see `tableProperties.ts`), which renders as inline `height:Npx` and acts as a
 * *minimum* (rows still grow with content, exactly like Word's "Specify height").
 */

/** Smallest row height a drag can produce (px). Below this a row is unusably thin. */
export const MIN_ROW_PX = 20;

/**
 * Compute the new row height from a drag gesture.
 *
 * @param startHeightPx measured height of the row when the drag began
 * @param dyPx          vertical pointer delta (positive = drag down = taller)
 * @param minPx         floor for the result (defaults to {@link MIN_ROW_PX})
 * @returns integer height, clamped to `>= minPx`
 */
export function computeRowHeight(
  startHeightPx: number,
  dyPx: number,
  minPx: number = MIN_ROW_PX
): number {
  const floor = Number.isFinite(minPx) ? Math.max(0, minPx) : 0;
  // No trustworthy base height → no meaningful drag; fall back to the floor.
  if (!Number.isFinite(startHeightPx)) return floor;
  const delta = Number.isFinite(dyPx) ? dyPx : 0;
  return Math.max(floor, Math.round(startHeightPx + delta));
}
