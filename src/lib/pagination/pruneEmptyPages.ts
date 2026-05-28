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

function getPageBody(node: PMNode): PMNode | null {
  const body = node.firstChild;
  if (!body || body.type.name !== "pageBody") return null;
  return body;
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
  const targetBody = getPageBody(targetPage.node);
  const sourceBody = getPageBody(sourcePage.node);
  if (!targetBody || !sourceBody) return;

  const targetBodyInfo = targetPage.node.childAfter(0);
  const sourceBodyInfo = sourcePage.node.childAfter(0);
  if (!targetBodyInfo.node || !sourceBodyInfo.node) return;

  const mergedContent = targetBody.content.append(sourceBody.content);
  const targetBodyPos = tr.mapping.map(targetPage.pos + 1 + targetBodyInfo.offset);

  tr.replaceWith(
    targetBodyPos,
    targetBodyPos + targetBodyInfo.node.nodeSize,
    schema.nodes.pageBody.create(targetBodyInfo.node.attrs, mergedContent)
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
