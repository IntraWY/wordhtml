import type { Watermark } from "@/types";

/**
 * Watermark rendering helpers — shared by the in-editor page-node renderer
 * (`pageNode.ts`) and the export paths (`wrap.ts`, PDF). Pure + testable.
 */

const DEFAULT_OPACITY = 0.12;
const DEFAULT_FONT_SIZE = 90; // px (editor page)
const DEFAULT_COLOR = "#1f2937";
const DEFAULT_ANGLE = -45; // deg

/** True when the watermark is present and has non-blank text. */
export function hasWatermark(wm?: Watermark | null): wm is Watermark {
  return !!wm && typeof wm.text === "string" && wm.text.trim().length > 0;
}

function clampOpacity(v: number | undefined): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return DEFAULT_OPACITY;
  return Math.min(1, Math.max(0, v));
}

/**
 * Attributes for a `.page-node` element: the `data-watermark` text plus the
 * CSS custom properties consumed by `.page-node[data-watermark]::before`.
 * Returns `{}` when there is no watermark.
 */
export function watermarkRenderAttrs(
  wm?: Watermark | null
): { dataWatermark?: string; styleVars?: string } {
  if (!hasWatermark(wm)) return {};
  const opacity = clampOpacity(wm.opacity);
  const size = wm.fontSize && wm.fontSize > 0 ? wm.fontSize : DEFAULT_FONT_SIZE;
  const color = wm.color || DEFAULT_COLOR;
  const angle = typeof wm.angle === "number" ? wm.angle : DEFAULT_ANGLE;
  const text = wm.text.trim();
  // --wm-text feeds `content: var(--wm-text)`. Single-quote it so the value is
  // safe inside the double-quoted HTML style attribute (no quote collision).
  const cssText = `'${text.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  return {
    dataWatermark: text,
    styleVars: `--wm-text:${cssText};--wm-opacity:${opacity};--wm-size:${size}px;--wm-color:${color};--wm-angle:${angle}deg;`,
  };
}

/** Escape a string for use inside a CSS `content: "..."` declaration. */
function cssContentEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * CSS for export documents (HTML download / PDF). Renders a fixed, centered,
 * rotated watermark that repeats on every printed page. Returns "" when none.
 */
export function watermarkPrintCss(wm?: Watermark | null): string {
  if (!hasWatermark(wm)) return "";
  const opacity = clampOpacity(wm.opacity);
  const color = wm.color || DEFAULT_COLOR;
  const angle = typeof wm.angle === "number" ? wm.angle : DEFAULT_ANGLE;
  const text = cssContentEscape(wm.text.trim());
  return [
    "body{position:relative;}",
    "body::before{",
    `content:"${text}";`,
    "position:fixed;top:0;left:0;right:0;bottom:0;",
    "display:flex;align-items:center;justify-content:center;",
    "pointer-events:none;z-index:9999;",
    "font-weight:800;white-space:nowrap;font-size:120px;",
    `color:${color};opacity:${opacity};`,
    `transform:rotate(${angle}deg);`,
    "}",
  ].join("");
}
