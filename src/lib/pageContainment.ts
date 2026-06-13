import { getPageDimensionsPx, PAGE_STACK_GAP_PX } from "./page";
import type { PageSetup } from "@/types";

/**
 * Off-screen page containment (`content-visibility: auto`) helpers for the
 * read-only multi-page preview surface.
 *
 * Why preview-only: the live editor renders a single ProseMirror instance whose
 * `.page-body` elements are measured by the pagination engine (ResizeObserver /
 * getBoundingClientRect) and host the caret. `content-visibility: auto` zeros
 * out the layout of off-screen subtrees, which would corrupt those measurements
 * and complicate selection. The preview (`MultiPagePreview`) has no live
 * measurement and no caret, so skipping off-screen render there is a pure win.
 */

/** Pages below this count don't benefit enough to risk intrinsic-size scroll
 * jitter, so containment stays off for short previews. */
export const CONTAINMENT_PAGE_THRESHOLD = 8;

/**
 * Whether off-screen containment should be enabled for a preview of `pageCount`
 * pages. Short documents render fully anyway; the `contain-intrinsic-size`
 * placeholder can cause minor scrollbar drift, so we only opt in once the page
 * count is large enough for the skipped-render win to dominate.
 */
export function shouldContainPages(pageCount: number): boolean {
  return pageCount >= CONTAINMENT_PAGE_THRESHOLD;
}

export interface IntrinsicPageSize {
  /** Placeholder width in px the browser reserves for an off-screen page. */
  widthPx: number;
  /** Placeholder height in px (page height + the stack gap below it). */
  heightPx: number;
}

/**
 * The `contain-intrinsic-size` an off-screen preview page should advertise so
 * scroll height stays stable while the page isn't rendered. Height includes the
 * inter-page stack gap so the total scroll height matches the rendered stack.
 * Page-size aware (A4 vs Letter, portrait vs landscape) — a fixed 794×1123 would
 * be wrong for Letter/landscape and cause the scrollbar to jump on activation.
 */
export function intrinsicPageSize(pageSetup: PageSetup): IntrinsicPageSize {
  const { widthPx, heightPx } = getPageDimensionsPx(pageSetup);
  return {
    widthPx,
    heightPx: heightPx + PAGE_STACK_GAP_PX,
  };
}
