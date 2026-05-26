"use client";

import type { Editor } from "@tiptap/react";
import type { PageSetup } from "@/types";
import { A4, LETTER, mmToPx } from "@/lib/page";
import { debugPerfLog } from "@/lib/debugPerfLog";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface PageMetrics {
  widthPx: number;
  heightPx: number;
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  contentHeightPx: number;
  headerFooterHeightPx: number;
}

export interface PaginationOptions {
  pageSetup: PageSetup;
  /** Height reserved for header + footer even when empty (px). Default 0. */
  headerFooterReservePx?: number;
  /** Tags that must stay on one page (atomic). Defaults to table, img, figure, svg. */
  atomicTags?: string[];
  /** Tolerance in px when comparing heights. Default 1. */
  tolerancePx?: number;
}

export interface SplitCandidate {
  pageBodyEl: HTMLElement;
  pageIndex: number;
  overflowPx: number;
  /** ProseMirror doc position of the first node that should move to next page */
  splitPos: number | null;
}

export type SplitHandler = (candidate: SplitCandidate) => void;

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_ATOMIC_TAGS = ["table", "img", "figure", "svg"];
const DEFAULT_TOLERANCE_PX = 1;
const DEFAULT_HEADER_FOOTER_RESERVE_PX = 0;

const SIZE_MAP = {
  A4,
  Letter: LETTER,
} as const;

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

export function calculatePageMetrics(
  pageSetup: PageSetup,
  headerFooterReservePx = DEFAULT_HEADER_FOOTER_RESERVE_PX
): PageMetrics {
  const size = SIZE_MAP[pageSetup.size];
  const isLandscape = pageSetup.orientation === "landscape";

  const widthMm = isLandscape ? size.hMm : size.wMm;
  const heightMm = isLandscape ? size.wMm : size.hMm;

  const widthPx = mmToPx(widthMm);
  const heightPx = mmToPx(heightMm);
  const marginTopPx = mmToPx(pageSetup.marginMm.top);
  const marginBottomPx = mmToPx(pageSetup.marginMm.bottom);
  const marginLeftPx = mmToPx(pageSetup.marginMm.left);
  const marginRightPx = mmToPx(pageSetup.marginMm.right);

  const contentHeightPx =
    heightPx - marginTopPx - marginBottomPx - headerFooterReservePx;

  return {
    widthPx,
    heightPx,
    marginTopPx,
    marginBottomPx,
    marginLeftPx,
    marginRightPx,
    contentHeightPx: Math.max(0, contentHeightPx),
    headerFooterHeightPx: headerFooterReservePx,
  };
}

/* ------------------------------------------------------------------ */
/* DOM helpers                                                         */
/* ------------------------------------------------------------------ */

function queryPageBodies(root: HTMLElement | Document): HTMLElement[] {
  return Array.from(root.querySelectorAll(".page-body"));
}

/**
 * Measures the rendered block content height inside a page body.
 * `.page-body` has `height: 100%` (full A4 frame), so `scrollHeight` /
 * `clientHeight` reflect the page frame (~1123px), not the text — using
 * those values caused every page to appear permanently overflowed.
 */
function measurePageBodyContentHeight(el: HTMLElement): number {
  const proseMirror = el.querySelector<HTMLElement>(".ProseMirror");
  const container = proseMirror ?? el;
  const children = Array.from(container.children) as HTMLElement[];
  if (children.length === 0) return 0;

  const containerTop = container.getBoundingClientRect().top;
  let maxBottom = 0;
  for (const child of children) {
    const rect = child.getBoundingClientRect();
    maxBottom = Math.max(maxBottom, rect.bottom - containerTop);
  }
  return maxBottom;
}

function getAtomicTagSet(options: PaginationOptions): Set<string> {
  return new Set(
    (options.atomicTags ?? DEFAULT_ATOMIC_TAGS).map((t) => t.toLowerCase())
  );
}

/** Image node views render as `<div>` wrappers — treat them as atomic. */
function isAtomicBlock(el: HTMLElement, atomicTags: Set<string>): boolean {
  const tag = el.tagName.toLowerCase();
  if (atomicTags.has(tag)) return true;
  if (el.querySelector("img")) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Measurement                                                         */
/* ------------------------------------------------------------------ */

export interface PageBodyMeasurement {
  pageIndex: number;
  el: HTMLElement;
  scrollHeight: number;
  clientHeight: number;
  overflowPx: number;
}

/**
 * Measures every `.page-body` inside `root` and returns those that exceed
 * their allowed `maxHeightPx`.
 */
export function measurePageBodies(
  root: HTMLElement | Document,
  maxHeightPx: number,
  tolerancePx = DEFAULT_TOLERANCE_PX
): PageBodyMeasurement[] {
  const bodies = queryPageBodies(root);
  const results: PageBodyMeasurement[] = [];

  for (let i = 0; i < bodies.length; i++) {
    const el = bodies[i];
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
    const contentHeightPx = measurePageBodyContentHeight(el);
    const overflowPx = contentHeightPx - maxHeightPx;

    if (overflowPx > tolerancePx) {
      results.push({
        pageIndex: i,
        el,
        scrollHeight: contentHeightPx,
        clientHeight,
        overflowPx,
      });
    }
  }

  return results;
}

/* ------------------------------------------------------------------ */
/* Split position detection                                            */
/* ------------------------------------------------------------------ */

/**
 * Walks the children of `pageBodyEl` from bottom to top and finds the
 * first block-level child whose bottom edge is still within the allowed
 * height. Returns the ProseMirror document position **after** that node
 * (i.e. where the split should happen).
 *
 * If no safe split point is found (e.g. a single atomic element is larger
 * than the page), returns `null`.
 */
export function findSplitPosition(
  editor: Editor,
  pageBodyEl: HTMLElement,
  maxHeightPx: number,
  atomicTags: Set<string>
): number | null {
  const proseMirror = pageBodyEl.querySelector<HTMLElement>(".ProseMirror");
  const container = proseMirror ?? pageBodyEl;
  const children = Array.from(container.children) as HTMLElement[];

  if (children.length === 0) return null;

  const containerRect = container.getBoundingClientRect();
  const containerTop = containerRect.top;

  // Walk from last child backwards.
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    const childRect = child.getBoundingClientRect();
    const childBottom = childRect.bottom - containerTop;

    if (childBottom <= maxHeightPx + DEFAULT_TOLERANCE_PX) {
      // This child fits. We want to split AFTER it.
      const pmPos = resolveDomToPmPos(editor, child);
      if (pmPos !== null) {
        // Resolve the node at this position and return the position after it.
        const $pos = editor.state.doc.resolve(pmPos);
        const nodeAfter = $pos.nodeAfter;
        if (nodeAfter) {
          return pmPos + nodeAfter.nodeSize;
        }
        return pmPos + 1;
      }
      return null;
    }

    // Child does not fit — split before splittable blocks (e.g. trailing paragraph).
    if (!isAtomicBlock(child, atomicTags)) {
      const pmPos = resolveDomToPmPos(editor, child);
      if (pmPos !== null) return pmPos;
    }

    // Atomic block does not fit — keep walking upward to split before it.
    if (isAtomicBlock(child, atomicTags)) {
      continue;
    }
  }

  // Every child overflows — likely a single huge atomic node or first paragraph.
  // Return position 1 (start of content) so the whole content moves to next page.
  const firstChild = children[0];
  const pmPos = resolveDomToPmPos(editor, firstChild);
  return pmPos !== null ? pmPos : null;
}

/**
 * Resolves a DOM element to its ProseMirror document position.
 * Uses the editor view's `posAtDOM` when available.
 */
function resolveDomToPmPos(editor: Editor, el: Element): number | null {
  try {
    const view = editor.view;
    const pos = view.posAtDOM(el, 0);
    if (typeof pos === "number" && pos >= 0) {
      return pos;
    }
  } catch {
    // posAtDOM can throw if the element is not inside the document.
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* PaginationEngine class                                              */
/* ------------------------------------------------------------------ */

export interface PaginationEngineCallbacks {
  onSplit: SplitHandler;
  onStable?: () => void;
}

/**
 * Idempotent pagination engine.
 *
 * 1. Observes `.page-body` elements via ResizeObserver (with polling fallback).
 * 2. When a page body exceeds its max height, computes a split candidate.
 * 3. Emits the candidate via `onSplit` callback so the caller can apply a
 *    ProseMirror transaction (e.g. insert a page break node).
 *
 * The engine itself never mutates the document — it only measures and reports.
 * This prevents infinite loops: the caller controls when / how splits are
 * applied, and can debounce or gate re-measurement.
 */
export class PaginationEngine {
  private editor: Editor;
  private options: PaginationOptions;
  private callbacks: PaginationEngineCallbacks;
  private observer: ResizeObserver | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;
  private lastSplitCount = 0;
  private stableCallScheduled = false;

  constructor(
    editor: Editor,
    options: PaginationOptions,
    callbacks: PaginationEngineCallbacks
  ) {
    this.editor = editor;
    this.options = options;
    this.callbacks = callbacks;
  }

  /* -- lifecycle -- */

  start(): void {
    if (this.isDestroyed) return;
    this.setupObserver();
    this.setupPollingFallback();
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /* -- observation -- */

  private setupObserver(): void {
    if (typeof ResizeObserver === "undefined") return;

    const root = this.editor.view.dom.ownerDocument;
    const bodies = queryPageBodies(root);
    if (bodies.length === 0) return;

    this.observer = new ResizeObserver(() => {
      if (this.isDestroyed) return;
      // Debounce: wait for layout storm to settle.
      this.scheduleCheck();
    });

    for (const body of bodies) {
      this.observer.observe(body);
    }
  }

  private setupPollingFallback(): void {
    // Polling fallback for environments without ResizeObserver (e.g. tests).
    if (typeof ResizeObserver !== "undefined") return;

    this.pollTimer = setInterval(() => {
      if (this.isDestroyed) return;
      this.checkAllPages();
    }, 500);
  }

  /**
   * Re-observe after DOM mutations (e.g. new page nodes added by another agent).
   * Safe to call multiple times — duplicates are ignored by ResizeObserver.
   */
  reobserve(): void {
    if (!this.observer) return;
    const root = this.editor.view.dom.ownerDocument;
    const bodies = queryPageBodies(root);
    for (const body of bodies) {
      this.observer.observe(body);
    }
  }

  /* -- checking -- */

  public scheduleCheck(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.checkAllPages();
    }, 100);
  }

  /**
   * Measures all page bodies and emits split candidates.
   * Idempotent: if the document has not changed, no candidates are emitted.
   */
  checkAllPages(): void {
    if (this.isDestroyed) return;

    const t0 = typeof performance !== "undefined" ? performance.now() : 0;
    const metrics = calculatePageMetrics(
      this.options.pageSetup,
      this.options.headerFooterReservePx ?? DEFAULT_HEADER_FOOTER_RESERVE_PX
    );

    const root = this.editor.view.dom.ownerDocument;
    const overflows = measurePageBodies(
      root,
      metrics.contentHeightPx,
      this.options.tolerancePx ?? DEFAULT_TOLERANCE_PX
    );

    const pageCount = root.querySelectorAll(".page-body").length;
    const checkMs =
      typeof performance !== "undefined" ? performance.now() - t0 : 0;
    // #region agent log
    debugPerfLog("B", "engine.ts:checkAllPages", "pagination measure", {
      checkMs: Math.round(checkMs * 100) / 100,
      pageCount,
      overflowCount: overflows.length,
    });
    // #endregion

    if (overflows.length === 0) {
      this.maybeEmitStable();
      return;
    }

    const atomicTags = getAtomicTagSet(this.options);
    let emitted = 0;

    for (const m of overflows) {
      const splitPos = findSplitPosition(
        this.editor,
        m.el,
        metrics.contentHeightPx,
        atomicTags
      );

      const candidate: SplitCandidate = {
        pageBodyEl: m.el,
        pageIndex: m.pageIndex,
        overflowPx: m.overflowPx,
        splitPos,
      };

      this.callbacks.onSplit(candidate);
      emitted++;
      break;
    }

    if (emitted > 0) {
      this.lastSplitCount = emitted;
      this.stableCallScheduled = false;
    } else {
      this.maybeEmitStable();
    }
  }

  private maybeEmitStable(): void {
    if (this.stableCallScheduled) return;
    this.stableCallScheduled = true;
    // Give the caller one frame to apply any pending transactions.
    requestAnimationFrame(() => {
      this.stableCallScheduled = false;
      if (!this.isDestroyed) {
        this.callbacks.onStable?.();
      }
    });
  }
}

/* ------------------------------------------------------------------ */
/* Pure-function API (for non-class consumers / tests)                 */
/* ------------------------------------------------------------------ */

export function createPaginationEngine(
  editor: Editor,
  options: PaginationOptions,
  callbacks: PaginationEngineCallbacks
): PaginationEngine {
  return new PaginationEngine(editor, options, callbacks);
}
