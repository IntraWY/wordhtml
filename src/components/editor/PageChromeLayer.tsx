"use client";

import { useLayoutEffect, useState, useCallback, useRef, type RefObject } from "react";
import { measureHeaderFooterReservePx } from "@/lib/pageChromeReserve";
import { resolvePageChromeHtml } from "@/lib/export/exportHeaderFooter";
import type { HeaderFooterConfig, PageSetup } from "@/types";
import { useEditorStore } from "@/store/editorStore";

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

/**
 * Reserve height (px) that page bodies must inset so live content does not
 * overlap header/footer chrome. Considers every variant that can appear on
 * some page (base, first-page, even) and takes the tallest.
 */
export function measureChromeReserveForConfig(hf: HeaderFooterConfig): number {
  let reserve = measureHeaderFooterReservePx(hf.headerHtml, hf.footerHtml);
  if (hf.differentFirstPage) {
    reserve = Math.max(
      reserve,
      measureHeaderFooterReservePx(hf.firstPageHeaderHtml, hf.firstPageFooterHtml)
    );
  }
  if (hf.differentOddEven) {
    reserve = Math.max(
      reserve,
      measureHeaderFooterReservePx(hf.evenHeaderHtml, hf.evenFooterHtml)
    );
  }
  return reserve;
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
  const fileName = useEditorStore((s) => s.fileName);
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
      const { headerHtml, footerHtml } = resolvePageChromeHtml(
        hf,
        pageNumber,
        pageCount,
        fileName
      );
      next.push({
        pageNumber,
        top: rect.top - anchorRect.top,
        left: rect.left - anchorRect.left,
        width: rect.width,
        height: rect.height,
        headerHtml,
        footerHtml,
        showPlaceholderHeader: !headerHtml.trim(),
        showPlaceholderFooter: !footerHtml.trim(),
      });
    });

    setBoxes(next);

    const reserve = measureChromeReserveForConfig(hf);
    if (reserve !== lastReserveRef.current) {
      lastReserveRef.current = reserve;
      onReserveHeightChange?.(reserve);
    }
  }, [pagesRootRef, scrollContainerRef, enabled, hf, pageCount, fileName, onReserveHeightChange]);

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
                dangerouslySetInnerHTML={{ __html: box.headerHtml }}
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
                dangerouslySetInnerHTML={{ __html: box.footerHtml }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
