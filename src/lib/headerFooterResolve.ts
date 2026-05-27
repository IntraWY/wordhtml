/**
 * Resolves header/footer HTML for a page number (first page / odd-even).
 */
export function resolveHeaderFooter(
  pageNumber: number,
  baseHeader: string,
  baseFooter: string,
  differentFirstPage: boolean,
  differentOddEven: boolean,
  firstPageHeader?: string,
  firstPageFooter?: string,
  evenHeader?: string,
  evenFooter?: string
): { header: string; footer: string } {
  let header = baseHeader;
  let footer = baseFooter;

  if (differentFirstPage && pageNumber === 1) {
    if (firstPageHeader !== undefined) header = firstPageHeader;
    if (firstPageFooter !== undefined) footer = firstPageFooter;
  } else if (differentOddEven && pageNumber % 2 === 0) {
    if (evenHeader !== undefined) header = evenHeader;
    if (evenFooter !== undefined) footer = evenFooter;
  }

  return { header, footer };
}
