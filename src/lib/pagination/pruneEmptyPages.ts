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

function renumberPageNodes(tr: Transaction, startPos = 0): void {
  let index = 0;
  tr.doc.nodesBetween(startPos, tr.doc.content.size, (node, pos) => {
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
 * Removes trailing page nodes whose body is empty. Keeps at least one page.
 */
export function buildPruneEmptyPagesTransaction(
  state: EditorState
): { tr: Transaction; removed: number } | null {
  const pages = collectPageNodes(state.doc);
  if (pages.length <= 1) return null;

  const toDelete: number[] = [];
  for (let i = pages.length - 1; i >= 1; i--) {
    const page = pages[i];
    const body = page.node.firstChild;
    if (!body || body.type.name !== "pageBody") break;
    if (!isPageBodyEffectivelyEmpty(body)) break;
    toDelete.push(page.pos);
  }

  if (toDelete.length === 0) return null;

  const tr = state.tr;
  toDelete.sort((a, b) => b - a);
  for (const pos of toDelete) {
    const mapped = tr.mapping.map(pos);
    const node = tr.doc.nodeAt(mapped);
    if (node?.type.name === "pageNode") {
      tr.delete(mapped, mapped + node.nodeSize);
    }
  }

  renumberPageNodes(tr);
  return { tr, removed: toDelete.length };
}
