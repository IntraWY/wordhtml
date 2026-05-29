import type { PageSetup } from "@/types";
import { getPageDimensionsPx, mmToPx } from "@/lib/page";

/** Printable content width inside page margins (px). */
export function getPageContentWidthPx(pageSetup: PageSetup): number {
  const { widthPx } = getPageDimensionsPx(pageSetup);
  const margins =
    mmToPx(pageSetup.marginMm.left) + mmToPx(pageSetup.marginMm.right);
  return Math.max(1, Math.round(widthPx - margins));
}

/** Measured `.page-body` width from the live editor, when available. */
export function measurePageBodyWidthFromDom(): number | undefined {
  if (typeof document === "undefined") return undefined;
  const body = document.querySelector(".page-body");
  if (!body) return undefined;
  const w = body.getBoundingClientRect().width;
  return w > 0 ? Math.round(w) : undefined;
}
