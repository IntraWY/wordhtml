"use client";

import { useLayoutEffect, useState, useCallback, useRef, type RefObject } from "react";
import { measureChromeReservePx, type ChromeReservePx } from "@/lib/pageChromeReserve";
import { resolveHeaderFooterForPage } from "@/lib/headerFooterResolve";
import { dispatchOpenHeaderFooter } from "@/lib/events";
import type { PageSetup } from "@/types";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

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

/** Strip height when the zone has no content (placeholder hint only). */
const PLACEHOLDER_STRIP_PX = 28;

export function PageChromeLayer({
  pagesRootRef,
  scrollContainerRef,
  pageSetup,
  pageCount,
  onReserveHeightChange,
}: PageChromeLayerProps) {
  const [boxes, setBoxes] = useState<PageChromeBox[]>([]);
  const [zones, setZones] = useState<ChromeReservePx>({
    headerPx: 0,
    footerPx: 0,
    totalPx: 0,
  });
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
      const { header, footer } = resolveHeaderFooterForPage(pageNumber, pageCount, hf);
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

    const reserve = measureChromeReservePx(hf);
    setZones(reserve);
    if (reserve.totalPx !== lastReserveRef.current) {
      lastReserveRef.current = reserve.totalPx;
      onReserveHeightChange?.(reserve.totalPx);
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

  const headerStripPx = zones.headerPx || PLACEHOLDER_STRIP_PX;
  const footerStripPx = zones.footerPx || PLACEHOLDER_STRIP_PX;

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
          {/* Strips re-enable pointer events so double-click opens the
              dialog (Word-style). They sit in the margin band, above the
              body text, so they don't shadow document content. */}
          <div
            className="page-chrome-header pointer-events-auto flex cursor-pointer items-center justify-center"
            style={{ height: headerStripPx }}
            title="ดับเบิลคลิกเพื่อแก้ไขส่วนหัว (Double-click to edit header)"
            onDoubleClick={dispatchOpenHeaderFooter}
          >
            {box.showPlaceholderHeader ? (
              <span className="page-chrome-placeholder">ส่วนหัว (Header)</span>
            ) : (
              <div
                className="w-full overflow-hidden text-center"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(box.headerHtml) }}
              />
            )}
          </div>
          <div
            className="page-chrome-footer pointer-events-auto absolute bottom-0 left-0 right-0 flex cursor-pointer items-center justify-center"
            style={{ height: footerStripPx }}
            title="ดับเบิลคลิกเพื่อแก้ไขส่วนท้าย (Double-click to edit footer)"
            onDoubleClick={dispatchOpenHeaderFooter}
          >
            {box.showPlaceholderFooter ? (
              <span className="page-chrome-placeholder">ส่วนท้าย (Footer)</span>
            ) : (
              <div
                className="w-full overflow-hidden text-center"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(box.footerHtml) }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
