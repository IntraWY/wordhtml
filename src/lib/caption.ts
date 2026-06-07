/**
 * Figure/table captions (B2). Captions are styled, numbered paragraphs marked
 * with `data-caption`. Numbering is computed at insert time by counting
 * existing captions of the same kind in the document HTML.
 */
export type CaptionKind = "figure" | "table";

export function captionLabel(kind: CaptionKind): string {
  return kind === "figure" ? "รูปที่" : "ตารางที่";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Count existing captions of a kind in the given HTML and return the next number. */
export function nextCaptionNumber(html: string, kind: CaptionKind): number {
  if (!html) return 1;
  const re = new RegExp(`data-caption="${kind}"`, "g");
  const matches = html.match(re);
  return (matches ? matches.length : 0) + 1;
}

/**
 * Build a caption paragraph: `รูปที่ N: text`. The `data-caption` attribute is
 * persisted by the ParagraphFormatExtension `captionKind` global attribute and
 * styled via CSS `p[data-caption]` (centered, muted, smaller).
 */
export function buildCaptionHtml(
  kind: CaptionKind,
  num: number,
  text = ""
): string {
  const label = captionLabel(kind);
  const body = text.trim()
    ? `${label} ${num}: ${escapeHtml(text.trim())}`
    : `${label} ${num}`;
  return `<p data-caption="${kind}">${body}</p>`;
}
