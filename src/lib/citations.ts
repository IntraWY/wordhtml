/**
 * Citations / bibliography (B9). Mirrors the footnote pattern: a bracketed
 * inline reference `[N]` plus a numbered bibliography entry (`data-citation`)
 * appended at document end — ordinary reflow-safe content.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Next citation number = count of existing bibliography entries + 1. */
export function nextCitationNumber(html: string): number {
  if (!html) return 1;
  const matches = html.match(/data-citation="/g);
  return (matches ? matches.length : 0) + 1;
}

/** Inline bracketed reference, e.g. `[1]`. */
export function buildCitationRefHtml(num: number): string {
  return `[${num}]`;
}

/** Bibliography entry appended at document end: `[1] reference`. */
export function buildBibliographyEntryHtml(num: number, text: string): string {
  return `<p data-citation="${num}">[${num}] ${escapeHtml(text.trim())}</p>`;
}
