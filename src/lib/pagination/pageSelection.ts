import type { EditorState } from "@tiptap/pm/state";

export interface PageSelectionContext {
  pageBodyDepth: number;
  pageBodyIndex: number;
  pageNumber: number;
  atPageBodyStart: boolean;
  atPageBodyEnd: boolean;
}

export function getPageSelectionContext(state: EditorState): PageSelectionContext | null {
  const { $from } = state.selection;
  if (!state.selection.empty) return null;

  let pageBodyDepth = -1;
  let pageNumber = 1;

  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "pageBody" && pageBodyDepth < 0) {
      pageBodyDepth = d;
    }
    if (node.type.name === "pageNode") {
      pageNumber = (node.attrs.pageNumber as number) ?? 1;
    }
  }

  if (pageBodyDepth < 0) return null;

  const pageBody = $from.node(pageBodyDepth);
  const pageBodyIndex = $from.index(pageBodyDepth);
  const atPageBodyStart = pageBodyIndex === 0 && $from.parentOffset === 0;

  const isLastBlock = pageBodyIndex === pageBody.childCount - 1;
  const atEndOfBlock = $from.parentOffset === $from.parent.content.size;
  const atPageBodyEnd = isLastBlock && atEndOfBlock;

  return {
    pageBodyDepth,
    pageBodyIndex,
    pageNumber,
    atPageBodyStart,
    atPageBodyEnd,
  };
}
