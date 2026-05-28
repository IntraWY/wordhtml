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
import {
  runPaginationMaintenance,
  PAGINATION_COOLDOWN_MS,
} from "@/lib/pagination/paginationMaintenance";
import { isLiveEditor } from "@/lib/editorLive";
import { debugPerfLog } from "@/lib/debugPerfLog";
import { useEditorStore } from "@/store/editorStore";
import {
  addEventListener,
  removeEventListener,
  EVENT_NAMES,
} from "@/lib/events";

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
  /** When false, pagination engine does not run (e.g. template preview mode). */
  enabled?: boolean;
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
/** Wait for typing to pause before measuring/splitting pages. */
const PAGINATION_TYPING_IDLE_MS = 450;
/** Wait for bulk HTML loads (snapshot/file) before measuring pages. */
const BULK_LOAD_PAGINATION_PAUSE_MS = 750;
const RESIZE_DEBOUNCE_MS = 150;
/** Cap queued auto-splits per idle cycle to avoid runaway page creation. */
const MAX_PENDING_SPLITS = 5;

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function usePagination(
  editor: Editor | null,
  pageSetup: PageSetup,
  options: UsePaginationOptions = {}
): UsePaginationResult {
  const { debounceMs = DEFAULT_DEBOUNCE_MS, scrollContainerRef, enabled = true } =
    options;
  const { headerFooterReservePx, atomicTags, tolerancePx } = options;
  const htmlSyncRevision = useEditorStore((s) => s.htmlSyncRevision);

  const [isPaginating, setIsPaginating] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const engineRef = useRef<PaginationEngine | null>(null);
  const pendingSplitsRef = useRef<SplitCandidate[]>([]);
  const stableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingRef = useRef(false);

  /* -- helpers -- */

  const countPages = useCallback((): number => {
    if (typeof document === "undefined") return 1;
    const bodies = document.querySelectorAll(".page-body");
    return Math.max(1, bodies.length);
  }, []);

  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const detectCurrentPage = useCallback((): number => {
    if (typeof document === "undefined") return 1;
    const bodies = Array.from(document.querySelectorAll(".page-body"));
    if (bodies.length === 0) return 1;

    if (!isLiveEditor(editor)) return currentPageRef.current;

    // Try to find which page contains the editor selection.
    const view = editor.view;
    if (!view) return 1;

    // Guard: if the editor is not focused, coordsAtPos can throw or return
    // stale coordinates. Return the last known page to avoid spurious state
    // updates during tab switching.
    if (typeof view.hasFocus === "function" && !view.hasFocus()) {
      return currentPageRef.current;
    }

    const anchor = view.state.selection.anchor;
    let anchorY: number;
    try {
      const coords = view.coordsAtPos(anchor);
      anchorY = coords.top;
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("coordsAtPos failed, keeping last page:", e);
      }
      return currentPageRef.current;
    }

    for (let i = 0; i < bodies.length; i++) {
      const rect = bodies[i].getBoundingClientRect();
      if (anchorY < rect.bottom + 1) {
        return i + 1;
      }
    }
    return bodies.length;
  }, [editor]);

  const applyPendingSplitsRef = useRef<() => void>(() => {});

  const scheduleStableCheck = useCallback(() => {
    if (stableTimerRef.current) {
      clearTimeout(stableTimerRef.current);
    }
    stableTimerRef.current = setTimeout(() => {
      stableTimerRef.current = null;
      applyPendingSplitsRef.current();
      setPageCount(countPages());
      setCurrentPage(detectCurrentPage());
    }, STABLE_DELAY_MS);
  }, [countPages, detectCurrentPage]);

  const applyPendingSplits = useCallback(() => {
    if (!isLiveEditor(editor)) {
      pendingSplitsRef.current = [];
      return;
    }
    if (isApplyingRef.current) return;

    const candidate = pendingSplitsRef.current.shift();
    if (!candidate) return;

    isApplyingRef.current = true;
    setIsPaginating(true);

    try {
      const result = buildSplitTransaction(
        {
          state: editor.state,
          schema: editor.state.schema,
          pageBreakNodeName: "pageBreak",
        },
        candidate
      );
      if (result.splitsInserted > 0 && isLiveEditor(editor)) {
        editor.view.dispatch(result.tr);
      }

      const { pruned } = runPaginationMaintenance(editor);
      if (pruned > 0) {
        engineRef.current?.pauseFor(PAGINATION_COOLDOWN_MS);
      }
    } catch (e) {
      console.error("Pagination split failed", e);
    } finally {
      isApplyingRef.current = false;
      setIsPaginating(false);
      setPageCount(countPages());
      setCurrentPage(detectCurrentPage());
      if (pendingSplitsRef.current.length > 0) {
        scheduleStableCheck();
      }
    }
  }, [editor, countPages, detectCurrentPage, scheduleStableCheck]);

  useEffect(() => {
    applyPendingSplitsRef.current = applyPendingSplits;
  }, [applyPendingSplits]);

  /* -- engine lifecycle -- */

  useEffect(() => {
    if (!enabled || !editor) return;

    const engineOptions: PaginationOptions = {
      pageSetup,
      headerFooterReservePx,
      atomicTags,
      tolerancePx,
    };

    const engine = new PaginationEngine(editor, engineOptions, {
      onSplit: (candidate) => {
        if (pendingSplitsRef.current.length >= MAX_PENDING_SPLITS) return;
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
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
        stableTimerRef.current = null;
      }
      pendingSplitsRef.current = [];
      engine.destroy();
      engineRef.current = null;
    };
  }, [
    enabled,
    editor,
    pageSetup,
    headerFooterReservePx,
    atomicTags,
    tolerancePx,
    scheduleStableCheck,
  ]);

  /* -- defer pagination after bulk HTML load (snapshot / file open) -- */

  useEffect(() => {
    if (htmlSyncRevision === 0) return;
    engineRef.current?.pauseFor(BULK_LOAD_PAGINATION_PAUSE_MS);
    // #region agent log
    debugPerfLog(
      "B",
      "usePagination.ts:bulkLoadPause",
      "pagination paused after bulk html load",
      { pauseMs: BULK_LOAD_PAGINATION_PAUSE_MS, htmlSyncRevision }
    );
    // #endregion
  }, [htmlSyncRevision]);

  /* -- editor updates -- */

  useEffect(() => {
    if (!enabled || !editor) return;
    const handler = () => {
      engineRef.current?.reobserve();
      if (typingIdleTimerRef.current) {
        clearTimeout(typingIdleTimerRef.current);
      }
      typingIdleTimerRef.current = setTimeout(() => {
        typingIdleTimerRef.current = null;
        if (!isApplyingRef.current && isLiveEditor(editor)) {
          const { pruned } = runPaginationMaintenance(editor);
          if (pruned > 0) {
            setPageCount(countPages());
            setCurrentPage(detectCurrentPage());
            engineRef.current?.pauseFor(PAGINATION_COOLDOWN_MS);
          }
          engineRef.current?.scheduleCheck();
          // #region agent log
          debugPerfLog(
            "B",
            "usePagination.ts:typingIdle",
            "pagination scheduled after typing idle",
            { idleMs: PAGINATION_TYPING_IDLE_MS }
          );
          // #endregion
        }
      }, PAGINATION_TYPING_IDLE_MS);
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      if (typingIdleTimerRef.current) {
        clearTimeout(typingIdleTimerRef.current);
        typingIdleTimerRef.current = null;
      }
    };
  }, [enabled, editor, countPages, detectCurrentPage]);

  /* -- cooldown after manual page merge / prune -- */

  useEffect(() => {
    if (!enabled) return;
    const onCooldown = () => {
      engineRef.current?.pauseFor(PAGINATION_COOLDOWN_MS);
    };
    addEventListener(EVENT_NAMES.paginationCooldown, onCooldown);
    return () => {
      removeEventListener(EVENT_NAMES.paginationCooldown, onCooldown);
    };
  }, [enabled]);

  /* -- window resize -- */

  useEffect(() => {
    const handleResize = () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = setTimeout(() => {
        resizeTimerRef.current = null;
        engineRef.current?.reobserve();
        engineRef.current?.scheduleCheck();
      }, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, []);

  /* -- page setup change explicit re-check -- */

  useEffect(() => {
    if (!enabled) return;
    // When pageSetup changes, force a re-check after a short delay
    // so the DOM has time to update padding / margins.
    const timer = setTimeout(() => {
      engineRef.current?.reobserve();
      engineRef.current?.checkAllPages();
      setPageCount(countPages());
      setCurrentPage(detectCurrentPage());
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [enabled, pageSetup, debounceMs, countPages, detectCurrentPage]);

  /* -- cleanup -- */

  useEffect(() => {
    return () => {
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
      }
      if (typingIdleTimerRef.current) {
        clearTimeout(typingIdleTimerRef.current);
      }
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
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
