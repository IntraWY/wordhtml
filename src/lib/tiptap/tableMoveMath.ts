// ── Pure math for the Word-style table move/reorder handle ───────────────────
//
// The block model `(block | pageBreak)+` has no free x/y position, so the table
// "move" handle reorders the table among its sibling blocks rather than floating
// it. Given the vertical midpoints of the sibling blocks and the pointer Y, this
// returns the insertion index. Pure — no DOM/PM — so it is unit-tested directly.

/**
 * Insertion index for a block dropped at `pointerY`, given the vertical
 * midpoints (in the same coordinate space) of the candidate sibling blocks in
 * document order. The result is the count of midpoints strictly above the
 * pointer → a value in `[0, midpointsPx.length]`.
 */
export function targetIndexFromY(
  pointerY: number,
  midpointsPx: readonly number[]
): number {
  let index = 0;
  for (const mid of midpointsPx) {
    if (mid < pointerY) index++;
    else break;
  }
  return index;
}
