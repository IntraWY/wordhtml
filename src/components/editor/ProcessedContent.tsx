"use client";

import { useMemo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { A4, LETTER, mmToPx } from "@/lib/page";
import type { PageSetup } from "@/types";
import { replaceVariables } from "./PageHeaderFooter";

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
}

/**
 * Sanitize HTML by parsing it and removing dangerous elements/attributes.
 * Strips <script>, event handlers (on*), and javascript: URLs.
 */
function sanitizeHtml(raw: string): string {
  if (!raw) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/html");

    // Remove <script> and <iframe> elements entirely
    const dangerousTags = ["script", "iframe", "object", "embed", "form"];
    dangerousTags.forEach((tag) => {
      doc.querySelectorAll(tag).forEach((el) => el.remove());
    });

    // Strip event handlers and dangerous attributes from all elements
    const allElements = doc.querySelectorAll("*");
    allElements.forEach((el) => {
      for (let i = el.attributes.length - 1; i >= 0; i--) {
        const attr = el.attributes[i];
        const name = attr.name.toLowerCase();
        const value = attr.value;
        if (
          name.startsWith("on") ||
          name === "action" ||
          (name === "href" && /^javascript:/i.test(value)) ||
          (name === "src" && /^javascript:/i.test(value))
        ) {
          el.removeAttribute(attr.name);
        }
      }
    });

    return doc.body.innerHTML;
  } catch {
    // Fallback: if DOMParser fails, return empty string to avoid security risk
    return "";
  }
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
    () => (headerHtml ? replaceVariables(headerHtml, pageNumber, totalPages) : ""),
    [headerHtml, pageNumber, totalPages]
  );
  const replacedFooter = useMemo(
    () => (footerHtml ? replaceVariables(footerHtml, pageNumber, totalPages) : ""),
    [footerHtml, pageNumber, totalPages]
  );

  return (
    <article
      className={cn("paper printable-paper bg-white shadow-sm flex flex-col", className)}
      style={{
        minHeight: heightPx,
        height: exactHeight
          ? heightPx -
            (showHeaderFooter && headerHtml ? 35 : 0) -
            (showHeaderFooter && footerHtml ? 35 : 0)
          : undefined,
        width: widthPx,
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
        className="page-content"
        style={{
          paddingTop: marginTopPx,
          paddingRight: marginRightPx,
          paddingBottom: marginBottomPx,
          paddingLeft: marginLeftPx,
        }}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
      {showHeaderFooter && footerHtml && (
        <div
          className="page-footer"
          dangerouslySetInnerHTML={{ __html: replacedFooter }}
        />
      )}
    </article>
  );
}
