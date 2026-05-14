"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseVirtualScrollOptions {
  /** Number of pages to render outside the viewport (before and after). */
  overscan?: number;
  /** Minimum number of pages before virtual scrolling activates. */
  threshold?: number;
}

interface UseVirtualScrollResult {
  /** Set of page indices that should be rendered. */
  visiblePages: Set<number>;
  /** Whether virtual scrolling is currently active (> threshold pages). */
  isActive: boolean;
  /** Ref to attach to the scroll container. */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Tracks which pages are visible within the viewport (plus overscan) using
 * IntersectionObserver. Returns a Set of visible page indices so the caller
 * can apply `content-visibility: auto` only to off-screen pages.
 *
 * This is a CSS-only virtual scroll helper — it does NOT manipulate the DOM
 * or break ProseMirror's single contenteditable instance.
 */
export function useVirtualScroll(
  pageBreaks: number[],
  options: UseVirtualScrollOptions = {}
): UseVirtualScrollResult {
  const { overscan = 1, threshold = 5 } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());

  const totalPages = pageBreaks.length;
  const isActive = totalPages > threshold;

  const buildPageElements = useCallback((): HTMLElement[] => {
    const container = containerRef.current;
    if (!container) return [];

    const article = container.querySelector<HTMLElement>("article.paper");
    if (!article) return [];

    const prose = article.querySelector<HTMLElement>(".ProseMirror");
    if (!prose) return [];

    // ProseMirror children are the top-level block nodes.
    return Array.from(prose.children) as HTMLElement[];
  }, []);

  useEffect(() => {
    if (!isActive) {
      setVisiblePages(new Set());
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const pageElements = buildPageElements();
    if (pageElements.length === 0) return;

    // Map each ProseMirror child to its page index based on pageBreaks.
    // pageBreaks[i] is the pixel offset where page i starts (0-indexed).
    const elementPageMap = new Map<HTMLElement, number>();

    const article = container.querySelector<HTMLElement>("article.paper");
    const articleRect = article?.getBoundingClientRect();
    const articleTop = articleRect?.top ?? 0;

    for (const el of pageElements) {
      const elTop = el.getBoundingClientRect().top - articleTop;
      // Find which page this element belongs to (last break <= elTop).
      let pageIdx = 0;
      for (let i = 1; i < pageBreaks.length; i++) {
        if (pageBreaks[i] <= elTop + 1) {
          pageIdx = i;
        } else {
          break;
        }
      }
      elementPageMap.set(el, pageIdx);
    }

    const visible = new Set<number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const pageIdx = elementPageMap.get(el);
          if (pageIdx === undefined) continue;

          if (entry.isIntersecting) {
            visible.add(pageIdx);
            // Add overscan pages before and after.
            for (let i = 1; i <= overscan; i++) {
              if (pageIdx - i >= 0) visible.add(pageIdx - i);
              if (pageIdx + i < totalPages) visible.add(pageIdx + i);
            }
          }
        }
        setVisiblePages(new Set(visible));
      },
      {
        root: container,
        threshold: 0,
        // Buffer slightly above/below viewport for smoother scrolling.
        rootMargin: "100px 0px 100px 0px",
      }
    );

    for (const el of pageElements) {
      observer.observe(el);
    }

    // Initial pass: mark all currently intersecting elements.
    const initialVisible = new Set<number>();
    for (const el of pageElements) {
      const rect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const isInView =
        rect.top < containerRect.bottom + 100 &&
        rect.bottom > containerRect.top - 100;
      if (isInView) {
        const pageIdx = elementPageMap.get(el);
        if (pageIdx !== undefined) {
          initialVisible.add(pageIdx);
          for (let i = 1; i <= overscan; i++) {
            if (pageIdx - i >= 0) initialVisible.add(pageIdx - i);
            if (pageIdx + i < totalPages) initialVisible.add(pageIdx + i);
          }
        }
      }
    }
    setVisiblePages(initialVisible);

    return () => {
      observer.disconnect();
      visible.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, pageBreaks, totalPages, overscan]);

  return { visiblePages, isActive, containerRef };
}
