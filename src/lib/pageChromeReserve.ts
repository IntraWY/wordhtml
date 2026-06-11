import { sanitizeHtml } from "@/lib/sanitizeHtml";
import type { HeaderFooterConfig } from "@/types";

/** Per-zone clamp: an empty zone reserves nothing; a non-empty zone gets at
 * least one comfortable line and at most MAX so a runaway logo can't eat the
 * page body. Total therefore stays within 0–160px. */
export const MIN_ZONE_PX = 24;
export const MAX_ZONE_PX = 80;

export interface ChromeReservePx {
  headerPx: number;
  footerPx: number;
  totalPx: number;
}

const EMPTY_RESERVE: ChromeReservePx = { headerPx: 0, footerPx: 0, totalPx: 0 };

function activeVariants(
  hf: HeaderFooterConfig,
  base: string | undefined,
  first: string | undefined,
  even: string | undefined
): string[] {
  const variants = [base];
  if (hf.differentFirstPage) variants.push(first);
  if (hf.differentOddEven) variants.push(even);
  return variants
    .map((v) => v?.trim() ?? "")
    .filter((v) => v.length > 0);
}

function measureZonePx(variants: string[], className: string): number {
  if (variants.length === 0) return 0;
  let max = 0;
  const probe = document.createElement("div");
  probe.className = className;
  probe.style.cssText =
    "visibility:hidden;position:fixed;top:-9999px;left:-9999px;width:794px";
  document.body.appendChild(probe);
  for (const html of variants) {
    probe.innerHTML = sanitizeHtml(html);
    max = Math.max(max, probe.offsetHeight);
  }
  document.body.removeChild(probe);
  return Math.min(MAX_ZONE_PX, Math.max(MIN_ZONE_PX, max));
}

/**
 * Measures how much vertical space the page body must give up for the live
 * header/footer chrome. Header and footer are measured separately, taking the
 * max across the active variants (base / first page / even pages), so e.g. a
 * tall first-page letterhead reserves enough room on every page to keep the
 * page bodies uniform.
 */
export function measureChromeReservePx(
  hf: HeaderFooterConfig | undefined | null
): ChromeReservePx {
  if (typeof document === "undefined" || !hf?.enabled) return EMPTY_RESERVE;

  const headerPx = measureZonePx(
    activeVariants(hf, hf.headerHtml, hf.firstPageHeaderHtml, hf.evenHeaderHtml),
    "page-chrome-header"
  );
  const footerPx = measureZonePx(
    activeVariants(hf, hf.footerHtml, hf.firstPageFooterHtml, hf.evenFooterHtml),
    "page-chrome-footer"
  );

  return { headerPx, footerPx, totalPx: headerPx + footerPx };
}

/** @deprecated Use measureChromeReservePx — kept for older call sites/tests. */
export function measureHeaderFooterReservePx(
  headerHtml?: string,
  footerHtml?: string
): number {
  return measureChromeReservePx({
    enabled: true,
    headerHtml: headerHtml ?? "",
    footerHtml: footerHtml ?? "",
    differentFirstPage: false,
    differentOddEven: false,
  }).totalPx;
}
