"use client";

import { useLayoutEffect, useState, useCallback, useRef, type RefObject } from "react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { resolveHeaderFooter } from "./PageHeaderFooter";
import { replacePageTokens } from "@/lib/placeholders";
import type { HeaderFooterConfig, PageSetup } from "@/types";
import { debugPerfLog } from "@/lib/debugPerfLog";

interface PageChromeLayerProps {
  /** Element that contains `.page-node` elements (usually PageCanvas). */
  pagesRootRef: RefObject<HTMLElement | null>;
  /** Scrollable ancestor — listen here so chrome repositions while scrolling. */
  scrollContainerRef: RefObject<HTMLElement | null>;
  pageSetup: PageSetup;
  pageCount: number;
  onReserveHeightChange?: (px: number) => void;
}

interface PageChromeBox {
  pageNumber: number;
  top: number;
  left: number;
  width: number;
  height: number;
  headerHtml: string;
  footerHtml: string;
  showPlaceholderHeader: boolean;
  showPlaceholderFooter: boolean;
}

function resolveForPage(
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

export function PageChromeLayer({
  pagesRootRef,
  scrollContainerRef,
  pageSetup,
  pageCount,
  onReserveHeightChange,
}: PageChromeLayerProps) {
  const [boxes, setBoxes] = useState<PageChromeBox[]>([]);
  const lastReserveRef = useRef(0);
  const hf = pageSetup.headerFooter;
  const enabled = Boolean(hf?.enabled);

  const measure = useCallback(() => {
    const pagesRoot = pagesRootRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!pagesRoot || !scrollEl || !enabled || !hf) {
      setBoxes([]);
      onReserveHeightChange?.(0);
      return;
    }

    const anchorRect = pagesRoot.getBoundingClientRect();
    const pages = pagesRoot.querySelectorAll(".page-node");
    const next: PageChromeBox[] = [];

    pages.forEach((pageEl, index) => {
      const rect = pageEl.getBoundingClientRect();
      const pageNumber = index + 1;
      const { header, footer } = resolveForPage(pageNumber, pageCount, hf);
      next.push({
        pageNumber,
        top: rect.top - anchorRect.top,
        left: rect.left - anchorRect.left,
        width: rect.width,
        height: rect.height,
        headerHtml: header,
        footerHtml: footer,
        showPlaceholderHeader: !header.trim(),
        showPlaceholderFooter: !footer.trim(),
      });
    });

    setBoxes(next);

    // #region agent log
    debugPerfLog("D", "PageChromeLayer.tsx:measure", "header/footer measure", {
      pageCount: pages.length,
      enabled,
    });
    // #endregion

    const probe = document.createElement("div");
    probe.className = "page-chrome-header";
    probe.style.cssText = "visibility:hidden;position:fixed;top:-9999px;left:-9999px";
    probe.innerHTML = sanitizeHtml(hf.headerHtml || hf.footerHtml || "X");
    document.body.appendChild(probe);
    const measured = probe.offsetHeight;
    document.body.removeChild(probe);
    const reserve = Math.min(120, Math.max(24, measured * 2));
    if (reserve !== lastReserveRef.current) {
      lastReserveRef.current = reserve;
      onReserveHeightChange?.(reserve);
    }
  }, [pagesRootRef, scrollContainerRef, enabled, hf, pageCount, onReserveHeightChange]);

  useLayoutEffect(() => {
    measure();
    const pagesRoot = pagesRootRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!pagesRoot) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(pagesRoot);
    if (scrollEl) ro.observe(scrollEl);
    pagesRoot.querySelectorAll(".page-node").forEach((el) => ro.observe(el));

    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        measure();
      });
    };
    scrollEl?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      scrollEl?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      lastReserveRef.current = 0;
      onReserveHeightChange?.(0);
    };
  }, [pagesRootRef, scrollContainerRef, measure, pageSetup, pageCount, enabled, onReserveHeightChange]);

  if (!enabled || boxes.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
      {boxes.map((box) => (
        <div
          key={box.pageNumber}
          className="absolute"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
          }}
        >
          <div className="page-chrome-header flex h-[28px] items-center justify-center">
            {box.showPlaceholderHeader ? (
              <span className="page-chrome-placeholder">ส่วนหัว (Header)</span>
            ) : (
              <div
                className="w-full text-center"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(box.headerHtml) }}
              />
            )}
          </div>
          <div
            className="page-chrome-footer absolute bottom-0 left-0 right-0 flex h-[28px] items-center justify-center"
          >
            {box.showPlaceholderFooter ? (
              <span className="page-chrome-placeholder">ส่วนท้าย (Footer)</span>
            ) : (
              <div
                className="w-full text-center"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(box.footerHtml) }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
