"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { RefObject } from "react";
import type { Editor } from "@tiptap/react";
import type { PageSetup } from "@/types";
import {
  PaginationEngine,
  type PaginationOptions,
  type SplitCandidate,
} from "@/lib/pagination/engine";
import { buildSplitTransaction } from "@/lib/pagination/splitter";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface UsePaginationResult {
  /** True while the engine is measuring or applying splits. */
  isPaginating: boolean;
  /** Total number of pages detected (1-based). */
  pageCount: number;
  /** Currently focused / visible page (1-based). */
  currentPage: number;
  /** Manually re-check all pages (e.g. after page-setup change). */
  recheck: () => void;
  /** Scroll to a specific page (1-based). */
  goToPage: (page: number) => void;
}

export interface UsePaginationOptions {
  /** Debounce delay in ms before running the engine. Default 100. */
  debounceMs?: number;
  /** Height reserved for header/footer even when empty (px). Default 0. */
  headerFooterReservePx?: number;
  /** Tags treated as atomic (moved whole to next page if they overflow). */
  atomicTags?: string[];
  /** Tolerance in px when comparing heights. Default 1. */
  tolerancePx?: number;
  /** Scroll container ref for goToPage scrolling. */
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_DEBOUNCE_MS = 100;
const STABLE_DELAY_MS = 150;
const PAGE_SCROLL_OFFSET_PX = 24;

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function usePagination(
  editor: Editor | null,
  pageSetup: PageSetup,
  options: UsePaginationOptions = {}
): UsePaginationResult {
  const { debounceMs = DEFAULT_DEBOUNCE_MS, scrollContainerRef } = options;
  const { headerFooterReservePx, atomicTags, tolerancePx } = options;

  const [isPaginating, setIsPaginating] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const engineRef = useRef<PaginationEngine | null>(null);
  const pendingSplitsRef = useRef<SplitCandidate[]>([]);
  const stableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingRef = useRef(false);

  /* -- helpers -- */

  const countPages = useCallback((): number => {
    if (typeof document === "undefined") return 1;
    const bodies = document.querySelectorAll(".page-body");
    return Math.max(1, bodies.length);
  }, []);

  const detectCurrentPage = useCallback((): number => {
    if (typeof document === "undefined") return 1;
    const bodies = Array.from(document.querySelectorAll(".page-body"));
    if (bodies.length === 0) return 1;

    // Try to find which page contains the editor selection.
    const view = editor?.view;
    if (!view) return 1;

    const anchor = view.state.selection.anchor;
    let anchorY: number;
    try {
      const coords = view.coordsAtPos(anchor);
      anchorY = coords.top;
    } catch {
      return bodies.length;
    }

    for (let i = 0; i < bodies.length; i++) {
      const rect = bodies[i].getBoundingClientRect();
      if (anchorY < rect.bottom + 1) {
        return i + 1;
      }
    }
    return bodies.length;
  }, [editor]);

  const applyPendingSplits = useCallback(() => {
    if (!editor || isApplyingRef.current) return;

    const candidates = pendingSplitsRef.current;
    if (candidates.length === 0) return;

    isApplyingRef.current = true;
    setIsPaginating(true);

    // Process one candidate at a time to avoid position drift.
    // In practice Phase 1 usually produces one candidate per check.
    const candidate = candidates[0];
    pendingSplitsRef.current = [];

    try {
      const result = buildSplitTransaction(
        {
          state: editor.state,
          schema: editor.state.schema,
          pageBreakNodeName: "pageBreak",
        },
        candidate
      );

      if (result.splitsInserted > 0) {
        editor.view.dispatch(result.tr);
      }
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Pagination split failed", e);
      }
    } finally {
      isApplyingRef.current = false;
      setIsPaginating(false);
      setPageCount(countPages());
      setCurrentPage(detectCurrentPage());
    }
  }, [editor, countPages, detectCurrentPage]);

  const scheduleStableCheck = useCallback(() => {
    if (stableTimerRef.current) {
      clearTimeout(stableTimerRef.current);
    }
    stableTimerRef.current = setTimeout(() => {
      stableTimerRef.current = null;
      applyPendingSplits();
      setPageCount(countPages());
      setCurrentPage(detectCurrentPage());
    }, STABLE_DELAY_MS);
  }, [applyPendingSplits, countPages, detectCurrentPage]);

  /* -- engine lifecycle -- */

  useEffect(() => {
    if (!editor) return;

    const engineOptions: PaginationOptions = {
      pageSetup,
      headerFooterReservePx,
      atomicTags,
      tolerancePx,
    };

    const engine = new PaginationEngine(editor, engineOptions, {
      onSplit: (candidate) => {
        pendingSplitsRef.current.push(candidate);
        scheduleStableCheck();
      },
      onStable: () => {
        scheduleStableCheck();
      },
    });

    engine.start();
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [editor, pageSetup, headerFooterReservePx, atomicTags, tolerancePx, scheduleStableCheck]);

  /* -- editor updates -- */

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      engineRef.current?.reobserve();
      engineRef.current?.scheduleCheck();
    };
    editor.on("update", handler);
    return () => { editor.off("update", handler); };
  }, [editor]);

  /* -- window resize -- */

  useEffect(() => {
    const handleResize = () => {
      engineRef.current?.reobserve();
      engineRef.current?.checkAllPages();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* -- page setup change explicit re-check -- */

  useEffect(() => {
    // When pageSetup changes, force a re-check after a short delay
    // so the DOM has time to update padding / margins.
    const timer = setTimeout(() => {
      engineRef.current?.reobserve();
      engineRef.current?.checkAllPages();
      setPageCount(countPages());
      setCurrentPage(detectCurrentPage());
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [pageSetup, debounceMs, countPages, detectCurrentPage]);

  /* -- cleanup -- */

  useEffect(() => {
    return () => {
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
      }
    };
  }, []);

  /* -- public recheck -- */

  const recheck = useCallback(() => {
    if (isApplyingRef.current) return;
    engineRef.current?.checkAllPages();
    setPageCount(countPages());
    setCurrentPage(detectCurrentPage());
  }, [countPages, detectCurrentPage]);

  /* -- scroll to page -- */

  const goToPage = useCallback(
    (pageNumber: number) => {
      if (typeof document === "undefined") return;
      const container = scrollContainerRef?.current;
      if (!container) return;

      const nodes = document.querySelectorAll(".page-node");
      if (nodes.length === 0) return;

      const clamped = Math.max(1, Math.min(pageNumber, nodes.length));
      const targetNode = nodes[clamped - 1];
      if (!targetNode) return;

      const containerRect = container.getBoundingClientRect();
      const nodeRect = targetNode.getBoundingClientRect();
      const relativeTop =
        nodeRect.top - containerRect.top + container.scrollTop - PAGE_SCROLL_OFFSET_PX;

      container.scrollTo({ top: Math.max(0, relativeTop), behavior: "smooth" });
      setCurrentPage(clamped);
    },
    [scrollContainerRef]
  );

  return {
    isPaginating,
    pageCount,
    currentPage,
    recheck,
    goToPage,
  };
}
