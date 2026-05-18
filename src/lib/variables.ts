/**
 * Replace header/footer template variables with actual values.
 * Supported variables: {page}, {total}, {date}
 */
export function replaceVariables(
  html: string,
  pageNumber: number,
  totalPages: number
): string {
  if (!html) return "";
  const date = new Date().toLocaleDateString("th-TH");
  return html
    .replace(/\{page\}/g, String(pageNumber))
    .replace(/\{total\}/g, String(totalPages))
    .replace(/\{date\}/g, date);
}
