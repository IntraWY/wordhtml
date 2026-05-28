"use client";

import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import type { Transaction, EditorState } from "@tiptap/pm/state";
import type { SplitCandidate } from "./engine";
import { isPageBodyEffectivelyEmpty } from "./pageBodyEmpty";
import type { PageSetup } from "@/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface SplitResult {
  /** Transaction that applies the split. */
  tr: Transaction;
  /** Number of page-break nodes inserted. */
  splitsInserted: number;
}

export interface SplitContext {
  state: EditorState;
  schema: Schema;
  /** Name of the page-break node type in the schema. Default "pageBreak". */
  pageBreakNodeName?: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_PAGE_BREAK_NODE_NAME = "pageBreak";

function defaultPageSetup(): PageSetup {
  return {
    size: "A4",
    orientation: "portrait",
    marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
  };
}

/* ------------------------------------------------------------------ */
/* Node splitting utilities                                            */
/* ------------------------------------------------------------------ */

/**
 * Splits a ProseMirror text node at a given character offset.
 * Returns `{ before, after }` where both are new text nodes with the
 * same marks as the original.
 */
export function splitTextNode(node: PMNode, offset: number): { before: PMNode; after: PMNode } {
  if (!node.isText || !node.text || offset < 0 || offset > node.text.length) {
    throw new Error("Invalid text split offset");
  }
  const beforeText = node.text?.slice(0, offset) ?? "";
  const afterText = node.text?.slice(offset) ?? "";
  return {
    before: node.type.schema.text(beforeText, node.marks),
    after: node.type.schema.text(afterText, node.marks),
  };
}

/**
 * Splits a generic ProseMirror node at a child index.
 * Returns `{ before, after }` where each contains a slice of the
 * original children.
 */
export function splitNodeAtChildIndex(node: PMNode, index: number): { before: PMNode; after: PMNode } {
  if (index < 0 || index > node.childCount) {
    throw new Error("Invalid child index for node split");
  }

  const beforeChildren: PMNode[] = [];
  const afterChildren: PMNode[] = [];

  node.forEach((child, _offset, i) => {
    if (i < index) {
      beforeChildren.push(child);
    } else {
      afterChildren.push(child);
    }
  });

  const before = node.type.create(node.attrs, beforeChildren);
  const after = node.type.create(node.attrs, afterChildren);

  return { before, after };
}

/**
 * Splits a node at a given "height" measured in child indices.
 * This is the primary entry point for paragraph-level splitting:
 * if a paragraph (or list, blockquote, etc.) has too many children,
 * we split it into two sibling nodes.
 *
 * For leaf nodes (text, hardBreak, etc.) this falls back to
 * `splitTextNode` when `node.isText`.
 */
export function splitNodeAtHeight(node: PMNode, offset: number): { before: PMNode; after: PMNode } {
  if (node.isText) {
    return splitTextNode(node, offset);
  }

  if (node.isLeaf) {
    // Leaf non-text nodes cannot be split meaningfully.
    // Return the whole node as "before" and an empty placeholder as "after".
    const empty = node.type.create(node.attrs);
    return { before: node, after: empty };
  }

  return splitNodeAtChildIndex(node, offset);
}

/* ------------------------------------------------------------------ */
/* Transaction builders                                                */
/* ------------------------------------------------------------------ */

function getPageBreakType(ctx: SplitContext) {
  const name = ctx.pageBreakNodeName ?? DEFAULT_PAGE_BREAK_NODE_NAME;
  const type = ctx.schema.nodes[name];
  if (!type) {
    throw new Error(`Schema does not contain a node named "${name}"`);
  }
  return type;
}

/**
 * Builds a ProseMirror transaction that inserts a page-break node at
 * `pos`. The break is inserted as a block node, so `pos` must be at a
 * block boundary (or we step to the nearest one).
 */
function insertPageBreakTr(ctx: SplitContext, tr: Transaction, pos: number): Transaction {
  const breakType = getPageBreakType(ctx);
  const $pos = tr.doc.resolve(pos);

  // Ensure we are at a block boundary. If not, split the parent block.
  let insertPos = pos;
  if ($pos.parentOffset !== 0 && $pos.parentOffset < $pos.parent.content.size) {
    // Split the current parent block at this position.
    const splitResult = tr.split($pos.pos);
    if (splitResult) {
      tr = splitResult;
      insertPos = tr.mapping.map(pos);
    }
  }

  tr = tr.insert(insertPos, breakType.create());
  return tr;
}

/* ------------------------------------------------------------------ */
/* High-level split strategies                                         */
/* ------------------------------------------------------------------ */

/**
 * Phase 1 paragraph-level split:
 *
 * Given a `SplitCandidate` with a `splitPos`, we try to move the
 * node at/after `splitPos` to the next page by inserting a page-break
 * immediately before it.
 *
 * If `splitPos` is `null` (single atomic element too large), we do
 * nothing — the caller should let the element overflow or handle it
 * via UI warning.
 */
export function applyParagraphLevelSplit(ctx: SplitContext, candidate: SplitCandidate): SplitResult {
  let tr = ctx.state.tr;
  let splitsInserted = 0;

  if (candidate.splitPos === null) {
    // No safe split point found (e.g. single atomic element > page height).
    // Phase 1: leave it as-is; do not attempt intra-node splitting.
    return { tr, splitsInserted };
  }

  const doc = ctx.state.doc;
  const pos = candidate.splitPos;

  // Validate position is inside the document.
  if (pos < 1 || pos > doc.content.size - 1) {
    return { tr, splitsInserted };
  }

  const $pos = doc.resolve(pos);

  // If we are inside a text node, walk up to the nearest block boundary.
  let blockPos = pos;
  let depth = $pos.depth;
  while (depth > 0) {
    const parent = $pos.node(depth);
    if (parent.isBlock) {
      blockPos = $pos.before(depth);
      break;
    }
    depth--;
  }

  // Insert page break at the block boundary.
  tr = insertPageBreakTr(ctx, tr, blockPos);
  splitsInserted = 1;

  return { tr, splitsInserted };
}

/**
 * Phase 1 atomic-unit handling:
 *
 * If a table, image, figure, or SVG overflows a page, we attempt to
 * move the **entire** element to the next page by inserting a page
 * break before it.
 *
 * This function assumes `candidate.splitPos` points somewhere inside
 * the atomic node. It resolves the start position of that node and
 * inserts a break there.
 */
export function applyAtomicUnitSplit(ctx: SplitContext, candidate: SplitCandidate): SplitResult {
  let tr = ctx.state.tr;
  let splitsInserted = 0;

  if (candidate.splitPos === null) {
    return { tr, splitsInserted };
  }

  const doc = ctx.state.doc;
  const pos = candidate.splitPos;

  if (pos < 1 || pos > doc.content.size - 1) {
    return { tr, splitsInserted };
  }

  const $pos = doc.resolve(pos);

  // Walk up to find the topmost block node that should stay atomic.
  let atomicDepth = $pos.depth;
  while (atomicDepth > 0) {
    const node = $pos.node(atomicDepth);
    if (node.isBlock) {
      break;
    }
    atomicDepth--;
  }

  const insertPos = $pos.before(atomicDepth);
  tr = insertPageBreakTr(ctx, tr, insertPos);
  splitsInserted = 1;

  return { tr, splitsInserted };
}

/* ------------------------------------------------------------------ */
/* Page-node split (creates new PageNode instead of pageBreak)         */
/* ------------------------------------------------------------------ */

/**
 * Splits a `pageNode` at `candidate.splitPos` by creating a new
 * `pageNode` with the overflowing content.
 *
 * This is used when the schema uses `pageNode` as the document node.
 */
export function applyPageNodeSplit(
  ctx: SplitContext,
  candidate: SplitCandidate
): SplitResult {
  const tr = ctx.state.tr;

  if (candidate.splitPos === null) {
    return { tr, splitsInserted: 0 };
  }

  const doc = ctx.state.doc;
  const pos = candidate.splitPos;
  const $pos = doc.resolve(pos);

  // Find the enclosing pageBody and pageNode.
  let pageBodyPos = -1;
  let pageBodyNode: PMNode | null = null;
  let pageBodyDepth = -1;
  let pageNodePos = -1;
  let pageNode: PMNode | null = null;

  for (let d = $pos.depth; d >= 0; d--) {
    const node = $pos.node(d);
    if (node.type.name === "pageBody" && pageBodyPos < 0) {
      pageBodyPos = $pos.before(d);
      pageBodyNode = node;
      pageBodyDepth = d;
    }
    if (node.type.name === "pageNode" && pageNodePos < 0) {
      pageNodePos = $pos.before(d);
      pageNode = node;
    }
  }

  if (!pageBodyNode || !pageNode || pageBodyPos < 0 || pageNodePos < 0) {
    // Fallback to pageBreak insertion if not inside a page structure.
    return applyParagraphLevelSplit(ctx, candidate);
  }

  // Find the block boundary at/after splitPos so we don't split mid-text.
  let blockPos = pos;
  let depth = $pos.depth;
  while (depth > 0) {
    const parent = $pos.node(depth);
    if (
      parent.isBlock &&
      parent.type.name !== "pageBody" &&
      parent.type.name !== "pageNode"
    ) {
      blockPos = $pos.before(depth);
      break;
    }
    depth--;
  }

  // Convert blockPos (document position) to a content offset inside pageBody.
  // Document positions include node opening/closing tokens, so a simple
  // subtraction gives the wrong offset. We resolve the position, find the
  // child index in pageBody, and sum the content sizes of preceding children.
  let splitOffset = 0;
  if (pageBodyDepth >= 0 && blockPos > pageBodyPos + 1) {
    const $blockPos = doc.resolve(blockPos);
    const childIndex = $blockPos.index(pageBodyDepth);
    for (let i = 0; i < childIndex; i++) {
      splitOffset += pageBodyNode.child(i).content.size;
    }
  }

  let contentBefore: Fragment;
  let contentAfter: Fragment;
  if (splitOffset === 0) {
    // Avoid infinite page creation when the body is empty or a single empty
    // paragraph still measures as overflow (min-height / placeholder).
    if (isPageBodyEffectivelyEmpty(pageBodyNode)) {
      return { tr, splitsInserted: 0 };
    }

    // Only child overflows. Leave an empty paragraph placeholder in the
    // current page and move all content to the next page.
    const emptyParagraph = ctx.schema.nodes.paragraph.create();
    contentBefore = Fragment.from(emptyParagraph);
    contentAfter = pageBodyNode.content;
  } else {
    contentBefore = pageBodyNode.content.cut(0, splitOffset);
    contentAfter = pageBodyNode.content.cut(splitOffset);
  }

  // Replace current pageBody with contentBefore.
  tr.replaceWith(
    pageBodyPos,
    pageBodyPos + pageBodyNode.nodeSize,
    ctx.schema.nodes.pageBody.create(pageBodyNode.attrs, contentBefore)
  );

  // Insert new pageNode after current pageNode.
  // Must map position through transaction because replaceWith changed doc size.
  const currentPageNumber = (pageNode.attrs.pageNumber as number) ?? 1;
  const currentPageSetup =
    (pageNode.attrs.pageSetup as PageSetup) ?? defaultPageSetup();
  const insertPos = tr.mapping.map(pageNodePos + pageNode.nodeSize);

  tr.insert(
    insertPos,
    ctx.schema.nodes.pageNode.create(
      {
        pageNumber: currentPageNumber + 1,
        pageSetup: { ...currentPageSetup },
      },
      [ctx.schema.nodes.pageBody.create(null, contentAfter)]
    )
  );

  // Update page numbers for subsequent pages.
  tr.doc.nodesBetween(
    insertPos + 1,
    tr.doc.content.size,
    (node, p) => {
      if (node.type.name === "pageNode") {
        // Skip the newly inserted pageNode — it already has the correct number.
        if (p === insertPos) return false;
        const pn = (node.attrs.pageNumber as number) ?? 1;
        if (pn > currentPageNumber) {
          tr.setNodeMarkup(p, undefined, {
            ...node.attrs,
            pageNumber: pn + 1,
          });
        }
        return false; // Don't descend into pageNode children.
      }
      return true; // Descend into other node types.
    }
  );

  return { tr, splitsInserted: 1 };
}

/* ------------------------------------------------------------------ */
/* Orchestrator                                                        */
/* ------------------------------------------------------------------ */

/**
 * Chooses the appropriate split strategy for a candidate and returns
 * a ProseMirror transaction.
 *
 * Phase 1 rules:
 * 1. If `splitPos` is null → no-op (return empty transaction).
 * 2. If schema has pageNode + pageBody → page-node split (create new page).
 * 3. Otherwise → paragraph-level split (insert page break before block).
 *
 * The caller is responsible for:
 * - dispatching the transaction (`editor.view.dispatch(result.tr)`)
 * - preventing infinite loops (e.g. only run after user edit + debounce)
 */
export function buildSplitTransaction(
  ctx: SplitContext,
  candidate: SplitCandidate
): SplitResult {
  if (ctx.schema.nodes.pageNode && ctx.schema.nodes.pageBody) {
    return applyPageNodeSplit(ctx, candidate);
  }
  return applyParagraphLevelSplit(ctx, candidate);
}

