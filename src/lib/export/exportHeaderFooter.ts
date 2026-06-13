import type { HeaderFooterConfig, PageSetup } from "@/types";
import { replacePageTokens } from "@/lib/placeholders";
import { resolveHeaderFooter } from "@/lib/headerFooterResolve";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

/**
 * Resolve the final, sanitized header/footer HTML for one page.
 *
 * Single source of truth shared by the live canvas chrome
 * (`PageChromeLayer`), the HTML export (`buildHeaderFooterExportBlocks`)
 * and the PDF export (`exportPdf`): variant selection (first page /
 * odd-even) → page-token substitution → sanitize.
 */
export function resolvePageChromeHtml(
  hf: HeaderFooterConfig,
  pageNumber: number,
  totalPages: number,
  fileName?: string | null
): { headerHtml: string; footerHtml: string } {
  const { header, footer } = resolveHeaderFooter(
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
  const ctx = { pageNumber, totalPages, fileName };
  return {
    headerHtml: sanitizeHtml(replacePageTokens(header, ctx)),
    footerHtml: sanitizeHtml(replacePageTokens(footer, ctx)),
  };
}

/**
 * Build print CSS + fixed header/footer blocks for HTML/PDF export when enabled.
 */
export function buildHeaderFooterExportBlocks(
  pageSetup: PageSetup | undefined,
  totalPages: number,
  fileName?: string | null
): { css: string; bodyPrefix: string; bodySuffix: string } {
  const hf = pageSetup?.headerFooter;
  if (!hf?.enabled) {
    return { css: "", bodyPrefix: "", bodySuffix: "" };
  }

  const pages: string[] = [];
  for (let p = 1; p <= Math.max(1, totalPages); p++) {
    const { headerHtml: h, footerHtml: f } = resolvePageChromeHtml(
      hf,
      p,
      totalPages,
      fileName
    );
    pages.push(
      `<div class="export-page-chrome" data-page="${p}" style="page-break-after: always;">
        <div class="export-hf-header">${h}</div>
        <div class="export-hf-footer">${f}</div>
      </div>`
    );
  }

  const css = `
    @media print {
      .export-hf-header, .export-hf-footer {
        font-size: 10pt;
        color: #52525b;
      }
      .export-hf-header { margin-bottom: 8mm; }
      .export-hf-footer { margin-top: 8mm; text-align: center; }
    }
    .export-page-chrome { display: none; }
    @media print {
      .export-page-chrome { display: block; }
    }
  `;

  return {
    css,
    bodyPrefix: pages.join("\n"),
    bodySuffix: "",
  };
}

export function countPageBreaksInHtml(html: string): number {
  const pageNodes = (html.match(/class="page-node"/g) ?? []).length;
  if (pageNodes > 0) return pageNodes;
  const breaks = (html.match(/data-type="page-break"|class="page-break"/g) ?? []).length;
  return Math.max(1, breaks + 1);
}
