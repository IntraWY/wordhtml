"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { replacePageTokens } from "@/lib/placeholders";

export interface PageHeaderFooterProps {
  pageNumber: number;
  totalPages: number;
  headerHtml?: string;
  footerHtml?: string;
  showHeaderFooter?: boolean;
  className?: string;
}

/** @deprecated Use replacePageTokens from @/lib/placeholders */
export { replacePageTokens as replaceVariables };

export { resolveHeaderFooter } from "@/lib/headerFooterResolve";

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
