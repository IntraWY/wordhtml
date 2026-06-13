/**
 * Shared, representation-agnostic core for the two pagination code paths.
 *
 * Both engines — the editor's ProseMirror reflow (`computePageBreaks` →
 * `repaginate.ts`) and the preview's HTML/DOM splitter (`splitHtmlIntoPages` in
 * `paginationEngine.ts`) — implement the same underlying rule: *greedily fill a
 * page with blocks until adding the next one would exceed the available content
 * height, then start a new page.*
 *
 * They differ only in HOW they measure each block (discrete outer heights vs.
 * absolute layout offsets) and in the representation-specific extras the preview
 * layers on top (keep-heading-with-next, avoid-break-inside, widow/orphan). To
 * keep the two from drifting apart on the part that IS identical, the fit rule
 * and the greedy index-fill live here, once.
 */

/**
 * The single fit-rule predicate shared by both engines.
 *
 * `extentPx` is the page-height that WOULD be consumed if a candidate block were
 * placed on the current page (for the editor: running sum + block height; for
 * the preview: the candidate block's absolute bottom minus the current page's
 * top). The block fits when that extent does not exceed the limit, within a
 * tolerance (the preview uses 1px; the editor uses 0).
 */
export function fitsWithinLimit(
  extentPx: number,
  limitPx: number,
  tolerancePx = 0
): boolean {
  return extentPx <= limitPx + tolerancePx;
}

export interface FillItem {
  /** Block height in px (outer height, including collapsed-margin model used by the caller). */
  height: number;
  /**
   * True when this block cannot be split here AND is taller than the page limit.
   * Such a block is placed alone on its own page.
   */
  atomic?: boolean;
}

export interface ComputeFillBreaksOptions {
  /** Tolerance in px applied to the fit comparison. Default 0. */
  tolerancePx?: number;
}

/**
 * Greedy first-fit page distributor over ordered block heights.
 *
 * Returns the item indices at which a new page should start (each value is the
 * exclusive upper bound of the preceding page). Every page is filled until the
 * next block would exceed `limitPx`. Oversized atomic blocks (`item.atomic`)
 * are placed alone on their own page because they cannot be split at this layer.
 *
 * `limitPx` may be a constant or a function of the zero-based page index — used
 * by A2 "different first page", where page 0 may have a smaller content area.
 *
 * Never emits a break equal to `items.length` (which would create an empty
 * trailing page).
 */
export function computeFillBreaks(
  items: FillItem[],
  limitPx: number | ((pageIndex: number) => number),
  options: ComputeFillBreaksOptions = {}
): number[] {
  const tolerancePx = options.tolerancePx ?? 0;
  const limitFor = typeof limitPx === "function" ? limitPx : () => limitPx;
  const breaks: number[] = [];
  let pageStart = 0;
  let acc = 0;
  let pageIndex = 0;

  for (let i = 0; i < items.length; i++) {
    const { height, atomic } = items[i];

    if (atomic) {
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

    if (
      i > pageStart &&
      !fitsWithinLimit(acc + height, limitFor(pageIndex), tolerancePx)
    ) {
      breaks.push(i);
      pageIndex++;
      pageStart = i;
      acc = 0;
    }
    acc += height;
  }

  // Drop any break that would create an empty final page.
  return breaks.filter((b) => b < items.length);
}
