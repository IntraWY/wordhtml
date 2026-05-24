/**
 * Replace header/footer template variables with actual values.
 * Supported variables: {page}, {total}, {date}
 *
 * Replacement values are HTML-escaped to prevent XSS if the result is
 * rendered without additional sanitization.
 */
export function replaceVariables(
  html: string,
  pageNumber: number,
  totalPages: number
): string {
  if (!html) return "";
  const date = new Date().toLocaleDateString("th-TH");
  return html
    .replace(/\{page\}/g, escapeHtml(String(pageNumber)))
    .replace(/\{total\}/g, escapeHtml(String(totalPages)))
    .replace(/\{date\}/g, escapeHtml(date));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
