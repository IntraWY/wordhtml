import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { isPageBodyEffectivelyEmpty } from "./pageBodyEmpty";

interface PageNodeRef {
  pos: number;
  node: PMNode;
  pageNumber: number;
}

function collectPageNodes(doc: PMNode): PageNodeRef[] {
  const pages: PageNodeRef[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "pageNode") {
      pages.push({
        pos,
        node,
        pageNumber: (node.attrs.pageNumber as number) ?? pages.length + 1,
      });
      return false;
    }
    return true;
  });
  return pages;
}

/**
 * The `pageBody` child of a page node, plus its offset within the page node's
 * content. A page may legitimately start with a `pageHeader` and/or end with a
 * `pageFooter` (`pageHeader? pageBody pageFooter?`), so we must SCAN for the
 * body rather than assume it is `firstChild`.
 */
function findPageBody(node: PMNode): { body: PMNode; offset: number } | null {
  let result: { body: PMNode; offset: number } | null = null;
  node.forEach((child, offset) => {
    if (!result && child.type.name === "pageBody") {
      result = { body: child, offset };
    }
  });
  return result;
}

function getPageBody(node: PMNode): PMNode | null {
  return findPageBody(node)?.body ?? null;
}

function renumberPageNodes(tr: Transaction): void {
  let index = 0;
  tr.doc.nodesBetween(0, tr.doc.content.size, (node, pos) => {
    if (node.type.name === "pageNode") {
      index += 1;
      const current = (node.attrs.pageNumber as number) ?? 0;
      if (current !== index) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, pageNumber: index });
      }
      return false;
    }
    return true;
  });
}

/**
 * Merges source page body content into target page body; deletes source page node.
 */
function mergePageIntoTarget(
  tr: Transaction,
  targetPage: PageNodeRef,
  sourcePage: PageNodeRef,
  schema: EditorState["schema"]
): void {
  // Scan for the body (it may be preceded by a pageHeader / followed by a
  // pageFooter) rather than assuming it is the page's first child.
  const targetInfo = findPageBody(targetPage.node);
  const sourceInfo = findPageBody(sourcePage.node);
  if (!targetInfo || !sourceInfo) return;

  const targetBody = targetInfo.body;
  const sourceBody = sourceInfo.body;

  const mergedContent = targetBody.content.append(sourceBody.content);
  const targetBodyPos = tr.mapping.map(targetPage.pos + 1 + targetInfo.offset);

  tr.replaceWith(
    targetBodyPos,
    targetBodyPos + targetBody.nodeSize,
    schema.nodes.pageBody.create(targetBody.attrs, mergedContent)
  );

  const deletePos = tr.mapping.map(sourcePage.pos);
  const sourceMapped = tr.doc.nodeAt(deletePos);
  if (sourceMapped?.type.name === "pageNode") {
    tr.delete(deletePos, deletePos + sourceMapped.nodeSize);
  }
}

/**
 * Removes empty page nodes and merges leading empty pages into the next page with content.
 * Always keeps at least one page.
 */
export function buildPruneEmptyPagesTransaction(
  state: EditorState
): { tr: Transaction; removed: number } | null {
  const pages = collectPageNodes(state.doc);
  if (pages.length <= 1) return null;

  const tr = state.tr;
  let removed = 0;
  let changed = true;

  while (changed) {
    changed = false;
    const current = collectPageNodes(tr.doc);
    if (current.length <= 1) break;

    const firstBody = getPageBody(current[0].node);
    if (firstBody && isPageBodyEffectivelyEmpty(firstBody)) {
      for (let i = 1; i < current.length; i++) {
        const body = getPageBody(current[i].node);
        if (body && !isPageBodyEffectivelyEmpty(body)) {
          mergePageIntoTarget(tr, current[0], current[i], state.schema);
          removed += 1;
          changed = true;
          break;
        }
      }
      if (changed) continue;
    }

    const last = current[current.length - 1];
    const lastBody = getPageBody(last.node);
    if (lastBody && isPageBodyEffectivelyEmpty(lastBody)) {
      const mapped = tr.mapping.map(last.pos);
      const node = tr.doc.nodeAt(mapped);
      if (node?.type.name === "pageNode") {
        tr.delete(mapped, mapped + node.nodeSize);
        removed += 1;
        changed = true;
      }
    }
  }

  if (removed === 0) return null;

  renumberPageNodes(tr);
  return { tr, removed };
}
