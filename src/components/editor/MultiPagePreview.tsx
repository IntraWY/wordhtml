"use client";

import { useMemo } from "react";
import { splitHtmlIntoPages } from "@/lib/paginationEngine";
import { cn } from "@/lib/utils";
import { ProcessedContent } from "./ProcessedContent";
import { resolveHeaderFooter } from "./PageHeaderFooter";
import type { PageSetup } from "@/types";

interface MultiPagePreviewProps {
  html: string;
  pageSetup: PageSetup;
  className?: string;
}

export function MultiPagePreview({ html, pageSetup, className }: MultiPagePreviewProps) {
  const pages = useMemo(() => {
    return splitHtmlIntoPages(html, pageSetup);
  }, [html, pageSetup]);

  const hf = pageSetup.headerFooter;
  const showHF = hf?.enabled ?? false;

  return (
    <div className={cn("multi-page-preview flex flex-col items-center gap-8 py-8", className)}>
      {pages.map((pageHtml, index) => {
        const pageNumber = index + 1;
        const { header, footer } = resolveHeaderFooter(
          pageNumber,
          hf?.headerHtml ?? "",
          hf?.footerHtml ?? "",
          hf?.differentFirstPage ?? false,
          hf?.differentOddEven ?? false,
          hf?.firstPageHeaderHtml,
          hf?.firstPageFooterHtml,
          hf?.evenHeaderHtml,
          hf?.evenFooterHtml
        );

        return (
          <div key={index} className="relative page-virtual">
            <ProcessedContent
              html={pageHtml}
              pageSetup={pageSetup}
              className="overflow-hidden"
              exactHeight
              pageNumber={pageNumber}
              totalPages={pages.length}
              headerHtml={header}
              footerHtml={footer}
              showHeaderFooter={showHF}
            />
          </div>
        );
      })}
    </div>
  );
}
