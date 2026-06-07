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
  const limitFor =
    typeof limitPx === "function" ? limitPx : () => limitPx;
  const breaks: number[] = [];
  let pageStart = 0;
  let acc = 0;
  let pageIndex = 0;

  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];

    if (atomicOversize.has(i)) {
      // Close the current page before the oversized block (unless empty).
      if (i > pageStart) {
        breaks.push(i);
        pageIndex++;
      }
      // The oversized block occupies its own page; next block starts after it.
      breaks.push(i + 1);
      pageIndex++;
      pageStart = i + 1;
      acc = 0;
      continue;
    }

    if (acc + h > limitFor(pageIndex) && i > pageStart) {
      breaks.push(i);
      pageIndex++;
      pageStart = i;
      acc = 0;
    }
    acc += h;
  }

  // Drop any break that would create an empty final page.
  return breaks.filter((b) => b < heights.length);
}
