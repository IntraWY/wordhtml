import type { PageSetup } from "@/types";
import { getPageDimensionsPx, mmToPx } from "@/lib/page";

/** Printable content width inside page margins (px). */
export function getPageContentWidthPx(pageSetup: PageSetup): number {
  const { widthPx } = getPageDimensionsPx(pageSetup);
  const margins =
    mmToPx(pageSetup.marginMm.left) + mmToPx(pageSetup.marginMm.right);
  return Math.max(1, Math.round(widthPx - margins));
}
