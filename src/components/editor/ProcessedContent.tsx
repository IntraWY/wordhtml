"use client";

import { useMemo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { A4, LETTER, mmToPx } from "@/lib/page";
import type { PageSetup } from "@/types";
import { replacePageTokens } from "@/lib/placeholders";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

interface ProcessedContentProps {
  html: string;
  pageSetup: PageSetup;
  className?: string;
  style?: CSSProperties;
  exactHeight?: boolean;
  /** Optional page number for multi-page phase */
  pageNumber?: number;
  totalPages?: number;
  headerHtml?: string;
  footerHtml?: string;
  showHeaderFooter?: boolean;
  /** Total header+footer reserve (px); halves applied per chrome band when exactHeight. */
  headerFooterReservePx?: number;
}

export function ProcessedContent({
  html,
  pageSetup,
  className,
  style,
  exactHeight = false,
  pageNumber = 1,
  totalPages = 1,
  headerHtml,
  footerHtml,
  showHeaderFooter = false,
  headerFooterReservePx = 0,
}: ProcessedContentProps) {
  const base = pageSetup.size === "Letter" ? LETTER : A4;
  const isLandscape = pageSetup.orientation === "landscape";
  const widthMm = isLandscape ? base.hMm : base.wMm;
  const heightMm = isLandscape ? base.wMm : base.hMm;
  const widthPx = Math.round(mmToPx(widthMm));
  const heightPx = Math.round(mmToPx(heightMm));
  const marginTopPx = Math.round(mmToPx(pageSetup.marginMm.top));
  const marginRightPx = Math.round(mmToPx(pageSetup.marginMm.right));
  const marginBottomPx = Math.round(mmToPx(pageSetup.marginMm.bottom));
  const marginLeftPx = Math.round(mmToPx(pageSetup.marginMm.left));

  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html]);

  const replacedHeader = useMemo(
    () =>
      sanitizeHtml(
        headerHtml ? replacePageTokens(headerHtml, { pageNumber, totalPages }) : ""
      ),
    [headerHtml, pageNumber, totalPages]
  );
  const replacedFooter = useMemo(
    () =>
      sanitizeHtml(
        footerHtml ? replacePageTokens(footerHtml, { pageNumber, totalPages }) : ""
      ),
    [footerHtml, pageNumber, totalPages]
  );

  const chromeHalf =
    headerFooterReservePx > 0
      ? Math.ceil(headerFooterReservePx / 2)
      : 0;
  const headerOffset =
    showHeaderFooter && headerHtml
      ? chromeHalf > 0
        ? chromeHalf
        : 35
      : 0;
  const footerOffset =
    showHeaderFooter && footerHtml
      ? chromeHalf > 0
        ? chromeHalf
        : 35
      : 0;

  return (
    <div
      className={cn(
        "page-node printable-paper flex flex-col",
        showHeaderFooter && (headerHtml || footerHtml) && "has-page-chrome",
        className
      )}
      data-page-number={pageNumber}
      style={{
        width: widthPx,
        minHeight: heightPx,
        height: exactHeight ? heightPx - headerOffset - footerOffset : undefined,
        ["--page-margin-top" as string]: `${marginTopPx}px`,
        ["--page-margin-right" as string]: `${marginRightPx}px`,
        ["--page-margin-bottom" as string]: `${marginBottomPx}px`,
        ["--page-margin-left" as string]: `${marginLeftPx}px`,
        ...style,
      }}
    >
      {showHeaderFooter && headerHtml && (
        <div
          className="page-header"
          dangerouslySetInnerHTML={{ __html: replacedHeader }}
        />
      )}
      <div
        className={cn(
          "page-body prose-editor",
          showHeaderFooter && (headerHtml || footerHtml) && "flex-1 min-h-0"
        )}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
      {showHeaderFooter && footerHtml && (
        <div
          className="page-footer"
          dangerouslySetInnerHTML={{ __html: replacedFooter }}
        />
      )}
    </div>
  );
}
