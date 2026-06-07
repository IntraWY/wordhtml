/**
 * Footnotes / endnotes (B1). A footnote inserts a superscript reference number
 * inline and appends a numbered note paragraph (marked `data-footnote`) at the
 * end of the document. Note paragraphs are ordinary content, so pagination
 * reflow handles them like any block — no pagination-core changes needed.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Next footnote number = count of existing note paragraphs + 1. */
export function nextFootnoteNumber(html: string): number {
  if (!html) return 1;
  const matches = html.match(/data-footnote="/g);
  return (matches ? matches.length : 0) + 1;
}

/** Inline superscript reference, e.g. `<sup>1</sup>`. */
export function buildFootnoteRefHtml(num: number): string {
  return `<sup>${num}</sup>`;
}

/** Note paragraph appended at document end: `1. text`. */
export function buildFootnoteNoteHtml(num: number, text: string): string {
  return `<p data-footnote="${num}">${num}. ${escapeHtml(text.trim())}</p>`;
}
