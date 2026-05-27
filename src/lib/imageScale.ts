import type { PageSetup } from "@/types";
import { getPageContentWidthPx } from "@/lib/pageContentWidth";

/** Resolve a width preset (e.g. "25%") to pixel width against a content container. */
export function resolveImagePresetWidth(
  preset: string,
  containerWidthPx: number,
  fallbackContainerWidthPx?: number
): string {
  if (!preset.includes("%")) return preset;
  const pct = parseFloat(preset) / 100;
  const base =
    containerWidthPx > 0
      ? containerWidthPx
      : fallbackContainerWidthPx && fallbackContainerWidthPx > 0
        ? fallbackContainerWidthPx
        : 0;
  if (!Number.isFinite(pct) || base <= 0) return preset;
  return String(Math.max(1, Math.round(base * pct)));
}

/** True when stored width matches a percentage preset for the given container. */
export function imageWidthMatchesPreset(
  width: string | null | undefined,
  preset: string,
  containerWidthPx: number
): boolean {
  if (!width || containerWidthPx <= 0) return false;
  if (width.includes("%")) return width === preset;
  const targetPx = Math.round(
    containerWidthPx * (parseFloat(preset) / 100)
  );
  const px = parseInt(width, 10);
  if (!Number.isFinite(px)) return false;
  return Math.abs(px - targetPx) <= 2;
}

/** Label for size bar — show preset % when width is a close px match. */
export function formatImageWidthLabel(
  width: string | null | undefined,
  containerWidthPx: number
): string {
  if (!width) return "ต้นฉบับ";
  if (width.includes("%")) return width;
  const px = parseInt(width, 10);
  if (!Number.isFinite(px) || containerWidthPx <= 0) return `${width}px`;
  const pct = Math.round((px / containerWidthPx) * 100);
  for (const preset of [25, 50, 75, 100]) {
    if (Math.abs(pct - preset) <= 2) return `${preset}%`;
  }
  return `${px}px`;
}

/** Convert img percentage widths to px for consistent preview/export. */
export function normalizeImagePercentWidths(
  html: string,
  pageSetup: PageSetup
): string {
  if (!html.includes("%")) return html;
  const contentW = getPageContentWidthPx(pageSetup);
  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><body>${html}</body></html>`,
    "text/html"
  );
  doc.body.querySelectorAll("img").forEach((img) => {
    const styleW = img.style.width;
    const attrW = img.getAttribute("width") ?? "";
    const source = styleW.includes("%") ? styleW : attrW.includes("%") ? attrW : "";
    if (!source.includes("%")) return;
    const px = resolveImagePresetWidth(source, 0, contentW);
    if (px.includes("%")) return;
    img.setAttribute("width", px);
    img.style.width = `${px}px`;
  });
  return doc.body.innerHTML;
}
