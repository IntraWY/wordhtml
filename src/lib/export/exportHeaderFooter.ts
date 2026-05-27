import type { PageSetup } from "@/types";
import { replacePageTokens } from "@/lib/placeholders";
import { resolveHeaderFooter } from "@/lib/headerFooterResolve";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

/**
 * Build print CSS + fixed header/footer blocks for HTML/PDF export when enabled.
 */
export function buildHeaderFooterExportBlocks(
  pageSetup: PageSetup | undefined,
  totalPages: number
): { css: string; bodyPrefix: string; bodySuffix: string } {
  const hf = pageSetup?.headerFooter;
  if (!hf?.enabled) {
    return { css: "", bodyPrefix: "", bodySuffix: "" };
  }

  const pages: string[] = [];
  for (let p = 1; p <= Math.max(1, totalPages); p++) {
    const { header, footer } = resolveHeaderFooter(
      p,
      hf.headerHtml,
      hf.footerHtml,
      hf.differentFirstPage,
      hf.differentOddEven,
      hf.firstPageHeaderHtml,
      hf.firstPageFooterHtml,
      hf.evenHeaderHtml,
      hf.evenFooterHtml
    );
    const h = sanitizeHtml(replacePageTokens(header, { pageNumber: p, totalPages }));
    const f = sanitizeHtml(replacePageTokens(footer, { pageNumber: p, totalPages }));
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
