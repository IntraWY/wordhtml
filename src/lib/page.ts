import type { PageSetup } from "@/types";

export const PX_PER_CM = 794 / 21; // 96 DPI: 21cm = 794px

export const A4 = { wMm: 210, hMm: 297 };
export const LETTER = { wMm: 215.9, hMm: 279.4 };

/** Width of the ruler column in the edit/preview paper grid. */
export const RULER_COLUMN_PX = 18;

/** PageCanvas `py-6` — distance from canvas top to first `.page-node`. */
export const PAGE_CANVAS_PADDING_PX = 24;

/** Gap between stacked pages (PageCanvas `gap-5` and preview stack). */
export const PAGE_STACK_GAP_PX = 20;

export function getPageDimensionsPx(pageSetup: PageSetup) {
  const base = pageSetup.size === "Letter" ? LETTER : A4;
  const isLandscape = pageSetup.orientation === "landscape";
  const widthMm = isLandscape ? base.hMm : base.wMm;
  const heightMm = isLandscape ? base.wMm : base.hMm;
  return {
    widthPx: Math.round(mmToPx(widthMm)),
    heightPx: Math.round(mmToPx(heightMm)),
    widthMm,
    heightMm,
  };
}

export function mmToPx(mm: number): number {
  return (mm / 10) * PX_PER_CM;
}

export function pxToMm(px: number): number {
  return (px / PX_PER_CM) * 10;
}

export function pxToCm(px: number): number {
  return px / PX_PER_CM;
}
