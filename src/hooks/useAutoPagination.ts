"use client";

import { useEffect, useRef, useCallback, type DependencyList } from "react";
import type { RefObject } from "react";
import type { PageSetup } from "@/types";
import {
  calculatePageBreaks,
  type SplitOptions,
} from "@/lib/paginationEngine";
import { usePaginationStore } from "@/store/paginationStore";

const RECALC_DEBOUNCE_MS = 300;
const CHUNKED_PAGE_THRESHOLD = 50;

function scheduleIdle(callback: () => void): number {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, { timeout: 500 });
  }
  return setTimeout(callback, 0) as unknown as number;
}

function cancelIdle(handle: number) {
  if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

export function useAutoPagination(
  containerRef: RefObject<HTMLElement | null>,
  pageSetup: PageSetup,
  options?: SplitOptions,
  deps: DependencyList = []
): {
  totalPages: number;
  currentPage: number;
  setCurrentPage: (n: number) => void;
  pageBreaks: number[];
  isCalculating: boolean;
} {
  const {
    totalPages,
    currentPage,
    pageBreaks,
    isCalculating,
    setTotalPages,
    setPageBreaks,
    setCurrentPage,
    setIsCalculating,
  } = usePaginationStore();

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleRef = useRef<number | null>(null);

  const runRecalculation = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const html = container.innerHTML;
    if (!html.trim()) {
      setPageBreaks([]);
      setTotalPages(1);
      setIsCalculating(false);
      return;
    }

    setIsCalculating(true);

    // Abort any in-flight calculation so only the latest wins.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Cancel pending scheduled work.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (idleRef.current) {
      cancelIdle(idleRef.current);
    }

    timerRef.current = setTimeout(() => {
      if (controller.signal.aborted) {
        setIsCalculating(false);
        return;
      }

      const execute = () => {
        if (controller.signal.aborted) return;

        try {
          const breaks = calculatePageBreaks(html, pageSetup, options);
          if (controller.signal.aborted) return;

          // For very large documents, commit the result in chunks so React
          // doesn't block the main thread with a huge state swap.
          if (breaks.length > CHUNKED_PAGE_THRESHOLD) {
            let idx = 0;
            const chunkSize = CHUNKED_PAGE_THRESHOLD;

            const pushChunk = () => {
              if (controller.signal.aborted) return;
              const chunk = breaks.slice(idx, Math.min(idx + chunkSize, breaks.length));
              setPageBreaks(chunk);
              setTotalPages(chunk.length);
              usePaginationStore.getState().setCurrentPage(
                Math.min(usePaginationStore.getState().currentPage, chunk.length)
              );
              idx += chunkSize;
              if (idx < breaks.length) {
                idleRef.current = scheduleIdle(pushChunk);
              } else {
                setIsCalculating(false);
              }
            };

            pushChunk();
          } else {
            setPageBreaks(breaks);
            setTotalPages(breaks.length);
            usePaginationStore.getState().setCurrentPage(
              Math.min(usePaginationStore.getState().currentPage, breaks.length)
            );
            setIsCalculating(false);
          }
        } catch {
          // Error logged silently - pagination will retry on next mutation
          if (!controller.signal.aborted) {
            setIsCalculating(false);
          }
        }
      };

      idleRef.current = scheduleIdle(execute);
    }, RECALC_DEBOUNCE_MS);
  }, [
    containerRef,
    pageSetup,
    options,
    setPageBreaks,
    setTotalPages,
    setIsCalculating,
  ]);

  // Observe size changes on the container.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      runRecalculation();
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
    };
  }, [containerRef, runRecalculation]);

  // Observe DOM mutations inside the container (content edits, pastes, etc.).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mo = new MutationObserver(() => {
      runRecalculation();
    });

    mo.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    return () => {
      mo.disconnect();
    };
  }, [containerRef, runRecalculation]);

  // Re-run when explicit deps change (e.g. html prop, pageSetup object identity).
  useEffect(() => {
    runRecalculation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Cleanup any pending work on unmount.
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (idleRef.current) {
        cancelIdle(idleRef.current);
      }
    };
  }, []);

  return {
    totalPages,
    currentPage,
    setCurrentPage,
    pageBreaks,
    isCalculating,
  };
}
