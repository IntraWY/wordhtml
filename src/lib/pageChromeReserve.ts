import { sanitizeHtml } from "@/lib/sanitizeHtml";

/** Matches edit-mode PageChromeLayer reserve (24–120px, header+footer). */
export function measureHeaderFooterReservePx(
  headerHtml?: string,
  footerHtml?: string
): number {
  if (typeof document === "undefined") return 0;
  const sample = (headerHtml?.trim() || footerHtml?.trim() || "").trim();
  if (!sample) return 0;

  const probe = document.createElement("div");
  probe.className = "page-chrome-header";
  probe.style.cssText =
    "visibility:hidden;position:fixed;top:-9999px;left:-9999px";
  probe.innerHTML = sanitizeHtml(sample);
  document.body.appendChild(probe);
  const measured = probe.offsetHeight;
  document.body.removeChild(probe);
  return Math.min(120, Math.max(24, measured * 2));
}
