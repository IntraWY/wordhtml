"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

export interface PageHeaderFooterProps {
  pageNumber: number;
  totalPages: number;
  headerHtml?: string;
  footerHtml?: string;
  showHeaderFooter?: boolean;
  className?: string;
}

/**
 * Replaces template variables in header/footer HTML with actual values.
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

/**
 * Resolves the correct header/footer HTML for a given page number
 * based on the configuration flags.
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
 * Full Phase-2 header/footer renderer.
 *
 * Renders a header area above the page content and a footer area below it,
 * with variable substitution ({page}, {total}, {date}).
 */
export function PageHeaderFooter({
  pageNumber,
  totalPages,
  headerHtml,
  footerHtml,
  showHeaderFooter = true,
  className,
}: PageHeaderFooterProps) {
  const replacedHeader = useMemo(
    () => sanitizeHtml(headerHtml ? replaceVariables(headerHtml, pageNumber, totalPages) : ""),
    [headerHtml, pageNumber, totalPages]
  );
  const replacedFooter = useMemo(
    () => sanitizeHtml(footerHtml ? replaceVariables(footerHtml, pageNumber, totalPages) : ""),
    [footerHtml, pageNumber, totalPages]
  );

  if (!showHeaderFooter) {
    return null;
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header zone */}
      {replacedHeader ? (
        <div
          className="page-header"
          dangerouslySetInnerHTML={{ __html: replacedHeader }}
        />
      ) : headerHtml === "" ? null : (
        <div className="page-header opacity-40">
          <span className="uppercase tracking-wider">ส่วนหัว (Header)</span>
        </div>
      )}

      {/* Footer zone */}
      {replacedFooter ? (
        <div
          className="page-footer"
          dangerouslySetInnerHTML={{ __html: replacedFooter }}
        />
      ) : footerHtml === "" ? null : (
        <div className="page-footer opacity-40">
          <span className="uppercase tracking-wider">ส่วนท้าย (Footer)</span>
        </div>
      )}
    </div>
  );
}
