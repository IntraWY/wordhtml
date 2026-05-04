import type { PageSetup } from "@/types";
import { A4, LETTER, mmToPx } from "@/lib/page";

export interface PageMetrics {
  widthPx: number;
  heightPx: number;
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  contentHeightPx: number; // height - margins
}

export interface SplitOptions {
  /** Tag names (lowercase) that should never be split across pages.
   *  The entire element will be forced onto the next page if it does not fit.
   *  Defaults to ["table", "img", "figure", "svg"].
   */
  avoidBreakInside?: string[];
  widowOrphanControl?: boolean;    // default: true
  minLinesBeforeBreak?: number;    // default: 2 (orphan)
  minLinesAfterBreak?: number;     // default: 2 (widow)
  keepHeadingWithNext?: boolean;   // default: true
}

const DEFAULT_AVOID_BREAK_INSIDE = ["table", "img", "figure", "svg"];
const DEFAULT_WIDOW_ORPHAN = true;
const DEFAULT_MIN_LINES_BEFORE = 2;
const DEFAULT_MIN_LINES_AFTER = 2;
const DEFAULT_KEEP_HEADING = true;

const SIZE_MAP = {
  A4,
  Letter: LETTER,
} as const;

export function calculatePageMetrics(pageSetup: PageSetup): PageMetrics {
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

  return {
    widthPx,
    heightPx,
    marginTopPx,
    marginBottomPx,
    marginLeftPx,
    marginRightPx,
    contentHeightPx: heightPx - marginTopPx - marginBottomPx,
  };
}

/* ------------------------------------------------------------------ */
/* Helper utilities                                                    */
/* ------------------------------------------------------------------ */

/** Estimate how many rendered lines an element occupies.
 *  Uses computed line-height when available, otherwise falls back to
 *  font-size * 1.5.
 */
function estimateLineCount(el: Element): number {
  const rect = el.getBoundingClientRect();
  if (rect.height <= 0) return 0;

  const style = window.getComputedStyle(el);
  const lineHeightStr = style.lineHeight;
  let lineHeightPx: number;

  if (lineHeightStr === "normal") {
    const fontSize = parseFloat(style.fontSize);
    lineHeightPx = fontSize * 1.5;
  } else {
    lineHeightPx = parseFloat(lineHeightStr);
  }

  if (!lineHeightPx || lineHeightPx <= 0) return 1;
  return Math.max(1, Math.round(rect.height / lineHeightPx));
}

function isParagraphLike(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  return tag === "p" || tag === "li" || tag === "blockquote";
}

function isHeading(el: Element): boolean {
  return /^h[1-6]$/.test(el.tagName.toLowerCase());
}

/* ------------------------------------------------------------------ */
/* Measurement host                                                    */
/* ------------------------------------------------------------------ */

function measureHtml(
  html: string,
  metrics: PageMetrics
): {
  children: Element[];
  host: HTMLDivElement;
  hostTop: number;
  contentTopOffset: number;
} {
  const measureHost = document.createElement("div");
  measureHost.style.position = "absolute";
  measureHost.style.visibility = "hidden";
  measureHost.style.pointerEvents = "none";
  measureHost.style.left = "-9999px";
  measureHost.style.top = "0px";
  measureHost.style.width = `${metrics.widthPx}px`;
  measureHost.style.minHeight = "1px";
  measureHost.style.overflow = "hidden";
  measureHost.style.boxSizing = "border-box";
  measureHost.style.paddingTop = `${metrics.marginTopPx}px`;
  measureHost.style.paddingBottom = `${metrics.marginBottomPx}px`;
  measureHost.style.paddingLeft = `${metrics.marginLeftPx}px`;
  measureHost.style.paddingRight = `${metrics.marginRightPx}px`;

  const refEl = document.querySelector(".prose-editor, #editor-content, article.paper") || document.body;
  const refStyle = window.getComputedStyle(refEl);
  measureHost.style.fontFamily = refStyle.fontFamily || "TH Sarabun PSK, sans-serif";
  measureHost.style.fontSize = refStyle.fontSize || "18.67px";
  measureHost.style.lineHeight = refStyle.lineHeight || "1.5";

  document.body.appendChild(measureHost);

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const sourceNodes = Array.from(doc.body.childNodes);

  const fragment = document.createDocumentFragment();
  sourceNodes.forEach((node) => fragment.appendChild(node));
  measureHost.appendChild(fragment);

  const children = Array.from(measureHost.children);
  const hostRect = measureHost.getBoundingClientRect();
  const hostTop = hostRect.top;
  const contentTopOffset = metrics.marginTopPx;

  return { children, host: measureHost, hostTop, contentTopOffset };
}

/* ------------------------------------------------------------------ */
/* Core grouping logic                                                   */
/* ------------------------------------------------------------------ */

function groupChildrenIntoPages(
  children: Element[],
  hostTop: number,
  contentTopOffset: number,
  metrics: PageMetrics,
  options?: SplitOptions
): Element[][] {
  const avoidBreakInside = new Set(
    (options?.avoidBreakInside ?? DEFAULT_AVOID_BREAK_INSIDE).map((t) =>
      t.toLowerCase()
    )
  );
  const widowOrphanControl = options?.widowOrphanControl ?? DEFAULT_WIDOW_ORPHAN;
  const minLinesBeforeBreak = options?.minLinesBeforeBreak ?? DEFAULT_MIN_LINES_BEFORE;
  const minLinesAfterBreak = options?.minLinesAfterBreak ?? DEFAULT_MIN_LINES_AFTER;
  const keepHeadingWithNext = options?.keepHeadingWithNext ?? DEFAULT_KEEP_HEADING;

  const pages: Element[][] = [];
  let currentPageNodes: Element[] = [];
  let pageStart = 0;

  // Precompute rects so we can look ahead without forcing multiple layouts.
  const childData = children.map((child) => {
    const rect = child.getBoundingClientRect();
    const childTop = rect.top - hostTop - contentTopOffset;
    const childBottom = rect.bottom - hostTop - contentTopOffset;
    const childHeight = childBottom - childTop;
    return { child, childTop, childBottom, childHeight };
  });

  for (let i = 0; i < childData.length; i++) {
    const { child, childTop, childBottom, childHeight } = childData[i];

    const relativeBottom = childBottom - pageStart;
    const fitsOnCurrent = relativeBottom <= metrics.contentHeightPx + 1; // +1px tolerance
    const tooBigForPage = childHeight > metrics.contentHeightPx;
    const mustKeepTogether = avoidBreakInside.has(child.tagName.toLowerCase());

    // ── Keep heading with next paragraph ──
    if (keepHeadingWithNext && isHeading(child)) {
      const nextData = childData[i + 1];
      if (nextData && nextData.child.tagName.toLowerCase() === "p") {
        const headingFitsAlone = childBottom - pageStart <= metrics.contentHeightPx + 1;
        const combinedFits = nextData.childBottom - pageStart <= metrics.contentHeightPx + 1;
        if (headingFitsAlone && !combinedFits) {
          // Heading would be left alone at the bottom of the page.
          // Pull heading + paragraph to the next page.
          if (currentPageNodes.length > 0) {
            pages.push(currentPageNodes);
            currentPageNodes = [];
          }
          currentPageNodes = [child, nextData.child];
          pageStart = childTop;
          i++; // skip the paragraph in the next iteration
          continue;
        }
      }
    }

    if (fitsOnCurrent) {
      currentPageNodes.push(child);
      continue;
    }

    // Does not fit on current page.
    if (mustKeepTogether && !tooBigForPage) {
      // Node is small enough to fit on a single page, so avoid breaking it.
      if (currentPageNodes.length > 0) {
        pages.push(currentPageNodes);
        currentPageNodes = [child];
        pageStart = childTop;
      } else {
        currentPageNodes.push(child);
      }
      continue;
    }

    if (currentPageNodes.length > 0) {
      pages.push(currentPageNodes);
    }
    currentPageNodes = [child];
    pageStart = childTop;
  }

  // Push any remaining nodes as the last page.
  if (currentPageNodes.length > 0) {
    pages.push(currentPageNodes);
  }

  // ── Widow / Orphan post-processing ──
  if (widowOrphanControl && pages.length > 1) {
    const MAX_ITERATIONS = 3;
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      let changed = false;

      // Orphan control: last node of a page must have at least minLinesBeforeBreak lines.
      for (let p = 0; p < pages.length - 1; p++) {
        const page = pages[p];
        if (page.length === 0) continue;
        const lastNode = page[page.length - 1];
        if (isParagraphLike(lastNode) && estimateLineCount(lastNode) < minLinesBeforeBreak) {
          page.pop();
          pages[p + 1].unshift(lastNode);
          changed = true;
        }
      }

      // Widow control: first node of a page must have at least minLinesAfterBreak lines.
      for (let p = 1; p < pages.length; p++) {
        const page = pages[p];
        if (page.length === 0) continue;
        const firstNode = page[0];
        if (isParagraphLike(firstNode) && estimateLineCount(firstNode) < minLinesAfterBreak) {
          const prevPage = pages[p - 1];
          if (prevPage.length > 0) {
            const pulled = prevPage.pop();
            if (pulled) {
              page.unshift(pulled);
              changed = true;
            }
          }
        }
      }

      // Remove any empty pages that may have been created.
      for (let p = pages.length - 1; p >= 0; p--) {
        if (pages[p].length === 0) {
          pages.splice(p, 1);
          changed = true;
        }
      }

      if (!changed) break;
    }
  }

  return pages;
}

/* ------------------------------------------------------------------ */
/* Public APIs                                                           */
/* ------------------------------------------------------------------ */

/**
 * Splits raw HTML into an array of page-sized HTML strings.
 *
 * Phase 3 improvements:
 * - Correct multi-page accumulation (pageStart offset).
 * - Break-inside: avoid for elements that fit on a single page.
 * - Widow/orphan control via line-count heuristics.
 * - Keep heading with next paragraph.
 */
export function splitHtmlIntoPages(
  html: string,
  pageSetup: PageSetup,
  options?: SplitOptions
): string[] {
  if (typeof document === "undefined") {
    // SSR fallback: return the whole HTML as a single page.
    return [html];
  }

  if (!html.trim()) {
    return [""];
  }

  const metrics = calculatePageMetrics(pageSetup);
  const { children, host, hostTop, contentTopOffset } = measureHtml(
    html,
    metrics
  );

  let pageHtmlStrings: string[];
  try {
    const pages = groupChildrenIntoPages(
      children,
      hostTop,
      contentTopOffset,
      metrics,
      options
    );

    pageHtmlStrings = pages.map((pageNodes) => {
      const wrapper = document.createElement("div");
      pageNodes.forEach((n) => wrapper.appendChild(n.cloneNode(true)));
      return wrapper.innerHTML;
    });
  } finally {
    // Cleanup measurement host even if grouping throws.
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }

  return pageHtmlStrings.length > 0 ? pageHtmlStrings : [html];
}

/**
 * Calculates only the pixel positions of page breaks from the top of the
 * document, without duplicating HTML strings. This is useful for the
 * `useAutoPagination` hook which stores break positions rather than full page
 * HTML to conserve memory.
 *
 * @returns Array of pixel offsets where each new page starts (page 1 starts
 *          at 0, page 2 starts at the first break, etc.). The array length
 *          equals `totalPages` and the last entry is the start of the last
 *          page.
 */
export function calculatePageBreaks(
  html: string,
  pageSetup: PageSetup,
  options?: SplitOptions
): number[] {
  if (typeof document === "undefined") {
    return [0];
  }

  if (!html.trim()) {
    return [0];
  }

  const metrics = calculatePageMetrics(pageSetup);
  const { children, host, hostTop, contentTopOffset } = measureHtml(
    html,
    metrics
  );


  let breaks: number[];
  try {
    const pages = groupChildrenIntoPages(
      children,
      hostTop,
      contentTopOffset,
      metrics,
      options
    );

    breaks = pages.map((page) => {
      const firstNode = page[0];
      if (!firstNode) return 0;
      const rect = firstNode.getBoundingClientRect();
      return rect.top - hostTop - contentTopOffset;
    });
  } finally {
    // Cleanup measurement host even if grouping throws.
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }

  return breaks;
}
