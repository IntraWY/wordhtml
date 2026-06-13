"use client";

import { useMemo } from "react";
import { stripPaginationWrappers } from "@/lib/export/stripPaginationWrappers";
import { splitHtmlIntoPages } from "@/lib/paginationEngine";
import { measureChromeReservePx } from "@/lib/pageChromeReserve";
import { PAGE_CANVAS_PADDING_PX, PAGE_STACK_GAP_PX } from "@/lib/page";
import { intrinsicPageSize, shouldContainPages } from "@/lib/pageContainment";
import { cn } from "@/lib/utils";
import { ProcessedContent } from "./ProcessedContent";
import { resolveHeaderFooter } from "./PageHeaderFooter";
import type { PageSetup } from "@/types";

interface MultiPagePreviewProps {
  html: string;
  pageSetup: PageSetup;
  className?: string;
  headerFooterReservePx?: number;
}

export function MultiPagePreview({
  html,
  pageSetup,
  className,
  headerFooterReservePx: headerFooterReservePxProp,
}: MultiPagePreviewProps) {
  const hf = pageSetup.headerFooter;
  const showHF = hf?.enabled ?? false;
  const headerFooterReservePx = useMemo(() => {
    if (headerFooterReservePxProp != null && headerFooterReservePxProp > 0) {
      return headerFooterReservePxProp;
    }
    if (!showHF || !hf) return 0;
    return measureChromeReservePx(hf).totalPx;
  }, [headerFooterReservePxProp, showHF, hf]);

  const pages = useMemo(() => {
    return splitHtmlIntoPages(stripPaginationWrappers(html), pageSetup, {
      headerFooterReservePx:
        headerFooterReservePx > 0 ? headerFooterReservePx : undefined,
    });
  }, [html, pageSetup, headerFooterReservePx]);

  // Off-screen page containment: only for large previews, where skipping the
  // render of off-screen pages is a clear win. The intrinsic size is page-size
  // aware (A4 vs Letter, portrait vs landscape) so the scroll height stays
  // stable while pages aren't rendered. Applied inline (overriding the static
  // `.page-virtual` rule) so it tracks the active page setup.
  const contain = shouldContainPages(pages.length);
  const intrinsic = useMemo(() => intrinsicPageSize(pageSetup), [pageSetup]);

  return (
    <div
      className={cn("multi-page-preview flex flex-col items-center", className)}
      style={{
        paddingTop: PAGE_CANVAS_PADDING_PX,
        paddingBottom: PAGE_CANVAS_PADDING_PX,
        gap: PAGE_STACK_GAP_PX,
      }}
    >
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
          <div
            key={index}
            className={cn("relative", contain && "page-virtual")}
            style={
              contain
                ? ({
                    contentVisibility: "auto",
                    containIntrinsicSize: `${intrinsic.widthPx}px ${intrinsic.heightPx}px`,
                  } as React.CSSProperties)
                : undefined
            }
          >
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
              headerFooterReservePx={headerFooterReservePx}
            />
          </div>
        );
      })}
    </div>
  );
}
