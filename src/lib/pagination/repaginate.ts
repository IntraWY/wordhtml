"use client";

import type { Editor } from "@tiptap/react";
import type { Node as PMNode, NodeType } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import { computePageBreaks } from "./computePageBreaks";
import { splitTableAtRowBoundaries } from "./tableReflow";

/**
 * Holistic re-pagination.
 *
 * Collects the entire content flow, measures each top-level block, splits any
 * single paragraph taller than one page at a line boundary (soft-split pieces,
 * re-joined on export), computes a fill-to-limit page break set, and rebuilds
 * the `pageNode` structure in one transaction — preserving the caret by
 * tracking its (block, offset).
 *
 * No-op (`changed:false`) when the distribution already matches, so it is safe
 * to call on every idle tick.
 */

export interface RepaginateResult {
  tr: Transaction | null;
  changed: boolean;
  pageCount: number;
}

const ATOMIC_TAGS = new Set(["TABLE", "IMG", "FIGURE", "SVG"]);

/**
 * Block heights are measured while content is stacked on one page, where
 * adjacent vertical margins collapse. After splitting, the first/last block on
 * each page no longer collapses against a neighbour, so a page's real rendered
 * height runs a little over the measured sum. Reserve a small safety margin
 * (~1.5 lines) so content never gets clipped by the page frame's overflow.
 */
const REFLOW_SAFETY_PX = 32;

function blockOuterHeight(el: Element): number {
  const rect = el.getBoundingClientRect();
  const cs = window.getComputedStyle(el);
  const mt = parseFloat(cs.marginTop) || 0;
  const mb = parseFloat(cs.marginBottom) || 0;
  return rect.height + mt + mb;
}

function isAtomic(el: Element): boolean {
  if (ATOMIC_TAGS.has(el.tagName)) return true;
  return !!el.querySelector("img, table");
}

/* ---- intra-paragraph splitting (line-accurate via DOM Range) ---- */

function textNodesOf(el: Element): Text[] {
  const out: Text[] = [];
  if (typeof document === "undefined") return out;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  while (n) {
    out.push(n as Text);
    n = walker.nextNode();
  }
  return out;
}

function locate(
  textNodes: Text[],
  charOffset: number
): { node: Text; offset: number } | null {
  let acc = 0;
  for (const t of textNodes) {
    const len = t.textContent?.length ?? 0;
    if (charOffset <= acc + len) return { node: t, offset: charOffset - acc };
    acc += len;
  }
  const last = textNodes[textNodes.length - 1];
  return last ? { node: last, offset: last.textContent?.length ?? 0 } : null;
}

/** {top,bottom} of the rendered content up to `charOffset`, relative to el top. */
function rectAt(
  el: Element,
  textNodes: Text[],
  charOffset: number
): { top: number; bottom: number } {
  const loc = locate(textNodes, charOffset);
  if (!loc) return { top: 0, bottom: 0 };
  const range = document.createRange();
  range.setStart(textNodes[0], 0);
  range.setEnd(loc.node, loc.offset);
  const r = range.getBoundingClientRect();
  const elTop = el.getBoundingClientRect().top;
  return { top: r.top - elTop, bottom: r.bottom - elTop };
}

/** Snap an offset back to the nearest preceding space (Latin); keep as-is for Thai. */
function snapBoundary(text: string, offset: number): number {
  for (let i = offset; i > offset - 16 && i > 0; i--) {
    if (text[i - 1] === " ") return i;
  }
  return offset;
}

interface Segment {
  start: number;
  end: number;
  height: number;
}

/** Split a too-tall block's text into page-sized segments at line boundaries. */
function findParagraphSegments(el: Element, limitPx: number): Segment[] {
  const textNodes = textNodesOf(el);
  const total = textNodes.reduce((s, t) => s + (t.textContent?.length ?? 0), 0);
  if (total === 0) return [{ start: 0, end: 0, height: 0 }];
  const fullText = textNodes.map((t) => t.textContent ?? "").join("");

  const bottomAt = (o: number) => rectAt(el, textNodes, o).bottom;

  const segments: Segment[] = [];
  let start = 0;
  let guard = 0;
  while (guard++ < 200) {
    // Cumulative baseline: rendered height already consumed up to `start`.
    // (rectAt(start).top is the top of the WHOLE [0..start] range — always the
    // first line — so it must NOT be used here.)
    const base = start === 0 ? 0 : bottomAt(start);
    if (bottomAt(total) - base <= limitPx) {
      segments.push({ start, end: total, height: bottomAt(total) - base });
      break;
    }
    // Largest end with (bottomAt(end) - base) <= limit.
    let lo = start + 1;
    let hi = total;
    let best = start + 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (bottomAt(mid) - base <= limitPx) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    let split = snapBoundary(fullText, best);
    if (split <= start) split = Math.max(start + 1, best);
    segments.push({ start, end: split, height: bottomAt(split) - base });
    start = split;
    if (start >= total) break;
  }
  return segments;
}

/* ---- measurement ---- */

export interface DomMeasurement {
  heights: number[];
  atomic: Set<number>;
  els: Element[];
}

function measureDomBlocks(): DomMeasurement | null {
  if (typeof document === "undefined") return null;
  const pageBodies = Array.from(document.querySelectorAll(".page-body"));
  const heights: number[] = [];
  const atomic = new Set<number>();
  const els: Element[] = [];
  let i = 0;
  for (const body of pageBodies) {
    for (const child of Array.from(body.children)) {
      heights.push(blockOuterHeight(child));
      els.push(child);
      if (isAtomic(child)) atomic.add(i);
      i++;
    }
  }
  return { heights, atomic, els };
}

/* ---- flow snapshot ---- */

export interface FlowSnapshot {
  blocks: PMNode[];
  pageBlockCounts: number[];
  pageSetup: unknown;
  blockStarts: number[];
  /**
   * Per source page, its editable `pageHeader` / `pageFooter` nodes (or null).
   * Captured so the holistic rebuild can preserve them — without this, every
   * reflow silently dropped on-canvas headers/footers (A1 data-loss bug).
   * Parallel to `pageBlockCounts`.
   */
  pageHeaders: (PMNode | null)[];
  pageFooters: (PMNode | null)[];
}

function readFlow(editor: Editor): FlowSnapshot | null {
  const { doc } = editor.state;
  const blocks: PMNode[] = [];
  const blockStarts: number[] = [];
  const pageBlockCounts: number[] = [];
  const pageHeaders: (PMNode | null)[] = [];
  const pageFooters: (PMNode | null)[] = [];
  let pageSetup: unknown = null;
  let sawPageNode = false;

  doc.forEach((pageNode, pageOffset) => {
    if (pageNode.type.name !== "pageNode") return;
    sawPageNode = true;
    if (pageSetup === null) pageSetup = pageNode.attrs.pageSetup;

    let header: PMNode | null = null;
    let footer: PMNode | null = null;
    let countOnPage = 0;
    pageNode.forEach((child, childOffset) => {
      if (child.type.name === "pageHeader") {
        header = child;
        return;
      }
      if (child.type.name === "pageFooter") {
        footer = child;
        return;
      }
      if (child.type.name !== "pageBody") return;
      const pageBodyStart = pageOffset + 1 + childOffset;
      let inner = pageBodyStart + 1;
      child.forEach((block) => {
        blocks.push(block);
        blockStarts.push(inner);
        inner += block.nodeSize;
        countOnPage++;
      });
    });
    pageBlockCounts.push(countOnPage);
    pageHeaders.push(header);
    pageFooters.push(footer);
  });

  if (!sawPageNode || blocks.length === 0) return null;
  return {
    blocks,
    blockStarts,
    pageBlockCounts,
    pageSetup,
    pageHeaders,
    pageFooters,
  };
}

function segmentize<T>(items: T[], breaks: number[]): T[][] {
  const segments: T[][] = [];
  let start = 0;
  for (const b of [...breaks, items.length]) {
    segments.push(items.slice(start, b));
    start = b;
  }
  return segments;
}

/* ---- expansion (split over-tall paragraphs into soft-split pieces) ---- */

interface ExpandResult {
  blocks: PMNode[];
  heights: number[];
  caretBlock: number;
  caretInner: number;
}

function isSplittableText(block: PMNode, el: Element): boolean {
  const name = block.type.name;
  if (name !== "paragraph" && name !== "heading") return false;
  if (isAtomic(el)) return false;
  // Char offsets must map 1:1 to content positions (pure text + marks).
  return block.textContent.length === block.content.size;
}

function expandTallBlocks(
  flow: FlowSnapshot,
  measured: DomMeasurement,
  limitPx: number,
  caretBlockOrig: number,
  caretInnerOrig: number
): ExpandResult {
  const blocks: PMNode[] = [];
  const heights: number[] = [];
  let caretBlock = -1;
  let caretInner = caretInnerOrig;

  for (let i = 0; i < flow.blocks.length; i++) {
    const block = flow.blocks[i];
    const el = measured.els[i];
    const tooTall = measured.heights[i] > limitPx;
    // Never re-split a piece that was already soft-split: re-cutting it every
    // cycle drifts offsets, multiplies pieces, and can drop content. Pieces are
    // re-joined on export; in-editor they stay as fitting paragraphs.
    const alreadyPiece = block.attrs.softSplit === true;

    // A3 (auto): an over-tall TABLE splits at row boundaries, mirroring the
    // paragraph path. `splitTableAtRowBoundaries` repeats the header on each
    // continuation piece (marked via `data-repeat-source`) and re-joins on
    // export. Returns null for an un-splittable table (e.g. one giant row) →
    // fall through to the atomic whole-table path (own page), no loop.
    if (tooTall && el && block.type.name === "table") {
      const pieces = splitTableAtRowBoundaries(
        block,
        el,
        measured.heights[i],
        limitPx
      );
      if (pieces && pieces.length > 1) {
        pieces.forEach((piece) => {
          blocks.push(piece.node);
          heights.push(piece.height);
          if (
            i === caretBlockOrig &&
            caretBlock === -1 &&
            caretInnerOrig >= piece.startOffset &&
            caretInnerOrig <= piece.endOffset
          ) {
            caretBlock = blocks.length - 1;
            caretInner =
              caretInnerOrig - piece.startOffset + piece.innerShift;
          }
        });
        continue;
      }
    }

    if (tooTall && !alreadyPiece && el && isSplittableText(block, el)) {
      const segs = findParagraphSegments(el, limitPx);
      if (segs.length > 1) {
        segs.forEach((seg) => {
          const slice = block.content.cut(seg.start, seg.end);
          const piece = block.type.create(
            { ...block.attrs, softSplit: true },
            slice
          );
          blocks.push(piece);
          heights.push(seg.height);
          if (i === caretBlockOrig) {
            // Caret lands in the piece whose range covers caretInnerOrig.
            if (
              caretInnerOrig >= seg.start &&
              caretInnerOrig <= seg.end &&
              caretBlock === -1
            ) {
              caretBlock = blocks.length - 1;
              caretInner = caretInnerOrig - seg.start;
            }
          }
        });
        continue;
      }
    }

    blocks.push(block);
    heights.push(measured.heights[i]);
    if (i === caretBlockOrig) {
      caretBlock = blocks.length - 1;
      caretInner = caretInnerOrig;
    }
  }

  return { blocks, heights, caretBlock, caretInner };
}

/* ---- main ---- */

export function buildRepaginateTransaction(
  editor: Editor,
  contentHeightPx: number,
  /** A2: page 1 content height when first-page margins differ (optional). */
  firstPageContentHeightPx?: number
): RepaginateResult {
  const flow = readFlow(editor);
  if (!flow) return { tr: null, changed: false, pageCount: 1 };

  const measured = measureDomBlocks();
  if (!measured) return { tr: null, changed: false, pageCount: 1 };

  if (measured.heights.length !== flow.blocks.length) {
    return { tr: null, changed: false, pageCount: flow.pageBlockCounts.length };
  }

  const limit = Math.max(1, contentHeightPx - REFLOW_SAFETY_PX);
  const firstLimit =
    firstPageContentHeightPx != null
      ? Math.max(1, firstPageContentHeightPx - REFLOW_SAFETY_PX)
      : limit;
  // Per-page capacity: page 0 may be smaller (A2). Others use the normal limit.
  const limitFor = (pageIndex: number) => (pageIndex === 0 ? firstLimit : limit);

  // Locate the caret's original (block, offset) before any expansion.
  const from = editor.state.selection.from;
  let caretBlockOrig = -1;
  let caretInnerOrig = 0;
  for (let i = 0; i < flow.blocks.length; i++) {
    const start = flow.blockStarts[i];
    const end = start + flow.blocks[i].content.size;
    if (from >= start && from <= end) {
      caretBlockOrig = i;
      caretInnerOrig = from - start;
      break;
    }
  }

  // Split any single paragraph taller than the page into line-sized pieces.
  const expanded = expandTallBlocks(
    flow,
    measured,
    limit,
    caretBlockOrig,
    caretInnerOrig
  );

  const atomicOversize = new Set<number>();
  expanded.heights.forEach((h, idx) => {
    // After expansion, remaining oversize blocks are atomic (table/image).
    if (h > limit) atomicOversize.add(idx);
  });

  const breaks = computePageBreaks(expanded.heights, limitFor, { atomicOversize });
  const desiredSegments = segmentize(expanded.blocks, breaks);
  const desiredCounts = desiredSegments.map((s) => s.length);

  // No-op only when nothing was split AND the page distribution already matches.
  const noSplit = expanded.blocks.length === flow.blocks.length;
  const same =
    noSplit &&
    desiredCounts.length === flow.pageBlockCounts.length &&
    desiredCounts.every((c, i) => c === flow.pageBlockCounts[i]);
  if (same) {
    return { tr: null, changed: false, pageCount: desiredCounts.length };
  }

  const schema = editor.state.schema;
  const pageNodeType = schema.nodes.pageNode;
  const pageBodyType = schema.nodes.pageBody;
  const paragraphType = schema.nodes.paragraph;
  if (!pageNodeType || !pageBodyType) {
    return { tr: null, changed: false, pageCount: flow.pageBlockCounts.length };
  }

  const newPages = buildPageNodes(desiredSegments, flow, {
    pageNodeType,
    pageBodyType,
    paragraphType,
  });

  const tr = editor.state.tr.replaceWith(
    0,
    editor.state.doc.content.size,
    Fragment.fromArray(newPages)
  );
  // Pagination is layout, not a user edit — keep it out of the undo stack.
  tr.setMeta("addToHistory", false);

  if (expanded.caretBlock >= 0) {
    const newStarts = blockContentStarts(tr.doc);
    if (expanded.caretBlock < newStarts.length) {
      const target = newStarts[expanded.caretBlock] + expanded.caretInner;
      const clamped = Math.min(Math.max(1, target), tr.doc.content.size - 1);
      try {
        tr.setSelection(TextSelection.near(tr.doc.resolve(clamped)));
      } catch {
        /* keep default selection */
      }
    }
  }

  return { tr, changed: true, pageCount: newPages.length };
}

interface PageNodeTypes {
  pageNodeType: NodeType;
  pageBodyType: NodeType;
  paragraphType: NodeType;
}

/**
 * Rebuild the `pageNode` list for a repagination, preserving each source page's
 * editable header/footer.
 *
 * Source pages and rebuilt pages map 1:1 by index; a rebuilt page reuses its
 * same-index source header/footer when present, otherwise falls back to page
 * 0's. That covers:
 *  - `{allPages}` headers (one on every source page) → re-applied per page;
 *  - growing the doc (new pages inherit the document's page-1 header/footer);
 *  - shrinking the doc (orphaned source headers/footers are simply not carried
 *    onto a surviving page — never silently lost from a page that keeps it).
 *
 * Exported for unit testing the header/footer-preservation contract without
 * DOM measurement.
 */
export function buildPageNodes(
  desiredSegments: PMNode[][],
  flow: Pick<FlowSnapshot, "pageHeaders" | "pageFooters" | "pageSetup">,
  types: PageNodeTypes
): PMNode[] {
  const { pageNodeType, pageBodyType, paragraphType } = types;
  const headerFor = (idx: number): PMNode | null =>
    flow.pageHeaders[idx] ?? flow.pageHeaders[0] ?? null;
  const footerFor = (idx: number): PMNode | null =>
    flow.pageFooters[idx] ?? flow.pageFooters[0] ?? null;

  return desiredSegments.map((segment, idx) => {
    const content = segment.length
      ? Fragment.fromArray(segment)
      : Fragment.from(paragraphType.create());
    const body = pageBodyType.create(null, content);
    const children: PMNode[] = [];
    const header = headerFor(idx);
    if (header) children.push(header);
    children.push(body);
    const footer = footerFor(idx);
    if (footer) children.push(footer);
    return pageNodeType.create(
      { pageNumber: idx + 1, pageSetup: flow.pageSetup },
      children
    );
  });
}

function blockContentStarts(doc: PMNode): number[] {
  const starts: number[] = [];
  doc.forEach((pageNode, pageOffset) => {
    if (pageNode.type.name !== "pageNode") return;
    pageNode.forEach((child, childOffset) => {
      if (child.type.name !== "pageBody") return;
      const pageBodyStart = pageOffset + 1 + childOffset;
      let inner = pageBodyStart + 1;
      child.forEach((block) => {
        starts.push(inner);
        inner += block.nodeSize;
      });
    });
  });
  return starts;
}
