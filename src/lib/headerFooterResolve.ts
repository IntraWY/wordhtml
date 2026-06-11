import { replacePageTokens } from "@/lib/placeholders";
import type { HeaderFooterConfig } from "@/types";

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

/**
 * Variant resolution + page-token substitution in one step. Shared by the
 * canvas chrome overlay (PageChromeLayer) and exports (PDF) so the printed
 * header/footer always matches what the user sees on screen.
 */
export function resolveHeaderFooterForPage(
  pageNumber: number,
  totalPages: number,
  hf: HeaderFooterConfig
): { header: string; footer: string } {
  const resolved = resolveHeaderFooter(
    pageNumber,
    hf.headerHtml ?? "",
    hf.footerHtml ?? "",
    hf.differentFirstPage ?? false,
    hf.differentOddEven ?? false,
    hf.firstPageHeaderHtml,
    hf.firstPageFooterHtml,
    hf.evenHeaderHtml,
    hf.evenFooterHtml
  );
  return {
    header: replacePageTokens(resolved.header, { pageNumber, totalPages }),
    footer: replacePageTokens(resolved.footer, { pageNumber, totalPages }),
  };
}
