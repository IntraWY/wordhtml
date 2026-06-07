"use client";

import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import { computePageBreaks } from "./computePageBreaks";

/**
 * Holistic re-pagination.
 *
 * Rather than splitting one overflowing page at a time (which produced an
 * overstuffed first page followed by near-empty trailing pages), this collects
 * the entire content flow, measures each top-level block, computes a
 * fill-to-limit page break set, and rebuilds the `pageNode` structure in a
 * single transaction — preserving the caret by tracking its (block, offset).
 *
 * The function is a no-op (`changed:false`) when the current page distribution
 * already matches the desired one, so it is safe to call on every idle tick.
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

interface FlowSnapshot {
  /** Top-level blocks across every pageBody, in document order. */
  blocks: PMNode[];
  /** Number of blocks currently on each page (for change detection). */
  pageBlockCounts: number[];
  /** pageSetup attrs from the first pageNode (reused for all rebuilt pages). */
  pageSetup: unknown;
  /** Absolute content-start position of each block in the current doc. */
  blockStarts: number[];
}

/** Reads the current pageNode/pageBody structure into a flat block flow. */
function readFlow(editor: Editor): FlowSnapshot | null {
  const { doc } = editor.state;
  const blocks: PMNode[] = [];
  const blockStarts: number[] = [];
  const pageBlockCounts: number[] = [];
  let pageSetup: unknown = null;
  let sawPageNode = false;

  doc.forEach((pageNode, pageOffset) => {
    if (pageNode.type.name !== "pageNode") return;
    sawPageNode = true;
    if (pageSetup === null) pageSetup = pageNode.attrs.pageSetup;

    // pageNode children: optional header, pageBody, optional footer.
    let countOnPage = 0;
    pageNode.forEach((child, childOffset) => {
      if (child.type.name !== "pageBody") return;
      // Absolute pos of pageBody = pageOffset + 1 (into pageNode) + childOffset.
      const pageBodyStart = pageOffset + 1 + childOffset;
      let inner = pageBodyStart + 1; // content start inside pageBody
      child.forEach((block) => {
        blocks.push(block);
        blockStarts.push(inner);
        inner += block.nodeSize;
        countOnPage++;
      });
    });
    pageBlockCounts.push(countOnPage);
  });

  if (!sawPageNode || blocks.length === 0) return null;
  return { blocks, blockStarts, pageBlockCounts, pageSetup };
}

/** Measures block heights from the DOM, aligned 1:1 with the PM flow. */
function measureDomBlocks(): { heights: number[]; atomic: Set<number> } | null {
  if (typeof document === "undefined") return null;
  const pageBodies = Array.from(document.querySelectorAll(".page-body"));
  const heights: number[] = [];
  const atomic = new Set<number>();
  let i = 0;
  for (const body of pageBodies) {
    for (const child of Array.from(body.children)) {
      heights.push(blockOuterHeight(child));
      if (isAtomic(child)) atomic.add(i);
      i++;
    }
  }
  return { heights, atomic };
}

/** Splits a flat array into segments at the given exclusive break indices. */
function segmentize<T>(items: T[], breaks: number[]): T[][] {
  const segments: T[][] = [];
  let start = 0;
  for (const b of [...breaks, items.length]) {
    segments.push(items.slice(start, b));
    start = b;
  }
  return segments;
}

export function buildRepaginateTransaction(
  editor: Editor,
  contentHeightPx: number
): RepaginateResult {
  const flow = readFlow(editor);
  if (!flow) return { tr: null, changed: false, pageCount: 1 };

  const measured = measureDomBlocks();
  if (!measured) return { tr: null, changed: false, pageCount: 1 };

  // Alignment guard: DOM blocks must match PM blocks 1:1, or bail (no corruption).
  if (measured.heights.length !== flow.blocks.length) {
    return { tr: null, changed: false, pageCount: flow.pageBlockCounts.length };
  }

  // Effective limit reserves a safety margin against post-split margin growth.
  const limit = Math.max(1, contentHeightPx - REFLOW_SAFETY_PX);

  // Oversized atomic blocks (taller than the page) get their own page.
  const atomicOversize = new Set<number>();
  measured.atomic.forEach((idx) => {
    if (measured.heights[idx] > limit) atomicOversize.add(idx);
  });

  const breaks = computePageBreaks(measured.heights, limit, {
    atomicOversize,
  });

  // Desired per-page block counts.
  const desiredSegments = segmentize(flow.blocks, breaks);
  const desiredCounts = desiredSegments.map((s) => s.length);

  // No-op if the distribution already matches (avoids churn on every tick).
  const same =
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

  // Build new pageNodes from the desired segments.
  const newPages: PMNode[] = desiredSegments.map((segment, idx) => {
    const content = segment.length
      ? Fragment.fromArray(segment)
      : Fragment.from(paragraphType.create());
    const body = pageBodyType.create(null, content);
    return pageNodeType.create(
      { pageNumber: idx + 1, pageSetup: flow.pageSetup },
      [body]
    );
  });

  // Track the caret as (block index, offset within block) before the rebuild.
  const sel = editor.state.selection;
  const from = sel.from;
  let caretBlock = -1;
  let caretInner = 0;
  for (let i = 0; i < flow.blocks.length; i++) {
    const start = flow.blockStarts[i];
    const end = start + flow.blocks[i].content.size;
    if (from >= start && from <= end) {
      caretBlock = i;
      caretInner = from - start;
      break;
    }
  }

  const tr = editor.state.tr.replaceWith(
    0,
    editor.state.doc.content.size,
    Fragment.fromArray(newPages)
  );
  // Pagination is layout, not a user edit — keep it out of the undo stack so
  // Ctrl+Z undoes the user's edit, not the reflow.
  tr.setMeta("addToHistory", false);

  // Restore the caret: find the same block's new content-start position.
  if (caretBlock >= 0) {
    const newStarts = blockContentStarts(tr.doc);
    if (caretBlock < newStarts.length) {
      const target = newStarts[caretBlock] + caretInner;
      const clamped = Math.min(Math.max(1, target), tr.doc.content.size - 1);
      try {
        tr.setSelection(TextSelection.near(tr.doc.resolve(clamped)));
      } catch {
        // leave default selection if resolve fails
      }
    }
  }

  return { tr, changed: true, pageCount: newPages.length };
}

/** Absolute content-start position of each pageBody child block, in order. */
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
