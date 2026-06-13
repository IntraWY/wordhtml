import { computeFillBreaks, type FillItem } from "./fillBreaks";

export interface ComputePageBreaksOptions {
  /**
   * Indices of blocks that are atomic (cannot be split here, e.g. a table or
   * image) AND taller than the page limit. Each gets its own page.
   */
  atomicOversize?: Set<number>;
}

/**
 * Greedy first-fit distributor over ordered block heights.
 *
 * Returns the block indices at which a new page should start (each value is the
 * exclusive upper bound of the preceding page). Every page is filled until the
 * next block would exceed `limitPx`, which avoids the "page 1 overstuffed, rest
 * near-empty" distribution produced by incremental one-split-per-cycle logic.
 *
 * Oversized atomic blocks (in `options.atomicOversize`) are placed alone on
 * their own page because they cannot be split at this layer.
 *
 * Never emits a break equal to `heights.length` (which would create an empty
 * trailing page).
 *
 * Thin adapter over the shared {@link computeFillBreaks} core (heights → fill
 * items, atomic set → per-item flag) so the editor and preview engines share
 * one fill-to-limit implementation. The editor compares with zero tolerance
 * (`acc + h > limit`), matching `computeFillBreaks`' default.
 */
export function computePageBreaks(
  heights: number[],
  /**
   * Page capacity in px. Either a constant (every page same height) or a
   * function of the zero-based page index — used by A2 "different first page",
   * where page 0 may have a smaller content area (larger margin).
   */
  limitPx: number | ((pageIndex: number) => number),
  options: ComputePageBreaksOptions = {}
): number[] {
  const atomicOversize = options.atomicOversize ?? new Set<number>();
  const items: FillItem[] = heights.map((height, i) => ({
    height,
    atomic: atomicOversize.has(i),
  }));
  return computeFillBreaks(items, limitPx);
}
