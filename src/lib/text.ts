/**
 * Text utilities for stripping HTML and counting words.
 *
 * Pure functions, safe to call from client components or tests (jsdom).
 */

/**
 * Strip HTML tags from a string and collapse whitespace into single spaces.
 *
 * @param html - HTML source string
 * @returns Trimmed plain text with collapsed whitespace
 */
export function plainTextFromHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Count words in an HTML string.
 *
 * Uses `Intl.Segmenter` with the Thai locale when available so that
 * scripts without word spaces (Thai, Japanese, Chinese) count properly.
 * Falls back to whitespace splitting in environments without Segmenter.
 *
 * @param html - HTML source string
 * @returns Number of word-like segments (>= 0)
 */
export function countWords(html: string): number {
  const text = plainTextFromHtml(html);
  if (!text) return 0;
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("th", { granularity: "word" });
    let n = 0;
    for (const s of seg.segment(text)) {
      if ((s as { isWordLike?: boolean }).isWordLike) n++;
    }
    return n;
  }
  return text.split(" ").filter(Boolean).length;
}
