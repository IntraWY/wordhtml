import { Extension } from "@tiptap/core";
import type { PageSetup } from "@/types";

function defaultPageSetup(): PageSetup {
  return {
    size: "A4",
    orientation: "portrait",
    marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
  };
}

function mergePageSetup(current: PageSetup, partial: Partial<PageSetup>): PageSetup {
  return {
    ...current,
    ...partial,
    marginMm: {
      ...current.marginMm,
      ...(partial.marginMm ?? {}),
    },
    headerFooter: partial.headerFooter
      ? { ...current.headerFooter, ...partial.headerFooter }
      : current.headerFooter,
  };
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageCommands: {
      insertPage: (attrs?: { pageNumber?: number; pageSetup?: PageSetup }) => ReturnType;
      splitPage: () => ReturnType;
      mergePage: () => ReturnType;
      setPageSetup: (pageSetup: Partial<PageSetup>) => ReturnType;
      setDocumentPageSetup: (pageSetup: Partial<PageSetup>) => ReturnType;
    };
  }
}

export const PageCommands = Extension.create({
  name: "pageCommands",

  addCommands() {
    return {
      insertPage:
        (attrs = {}) =>
        ({ chain, state }) => {
          const { $from } = state.selection;
          const pos = $from.after($from.depth);

          const pageSetup = attrs.pageSetup ?? defaultPageSetup();
          const pageNumber = attrs.pageNumber ?? 1;

          return chain()
            .insertContentAt(pos, {
              type: "pageNode",
              attrs: {
                pageNumber,
                pageSetup,
              },
              content: [
                { type: "pageBody" },
              ],
            })
            .focus()
            .run();
        },

      splitPage:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const { selection } = state;
          const { $from } = selection;

          // Find the current pageBody node
          let pageBodyPos = -1;
          let pageBodyNode = state.doc;
          for (let d = $from.depth; d >= 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "pageBody") {
              pageBodyPos = $from.before(d);
              pageBodyNode = node;
              break;
            }
          }

          if (pageBodyPos < 0 || !pageBodyNode) return false;

          // Find the parent pageNode
          let pageNodePos = -1;
          let pageNode = state.doc;
          for (let d = $from.depth; d >= 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "pageNode") {
              pageNodePos = $from.before(d);
              pageNode = node;
              break;
            }
          }

          if (pageNodePos < 0 || !pageNode) return false;

          const currentPageSetup =
            (pageNode.attrs.pageSetup as PageSetup) ?? defaultPageSetup();
          const currentPageNumber =
            (pageNode.attrs.pageNumber as number) ?? 1;

          // Calculate split point relative to the pageBody content
          const splitPos = $from.pos - pageBodyPos - 1;

          // Split the pageBody content at the cursor position
          const contentBefore = pageBodyNode.content.cut(0, splitPos);
          const contentAfter = pageBodyNode.content.cut(splitPos);

          // Replace current pageBody with contentBefore
          tr.replaceWith(
            pageBodyPos,
            pageBodyPos + pageBodyNode.nodeSize,
            state.schema.nodes.pageBody.create(pageBodyNode.attrs, contentBefore)
          );

          // Insert new pageNode with contentAfter after current pageNode.
          // Must map position because replaceWith changed document size.
          const insertPos = tr.mapping.map(pageNodePos + pageNode.nodeSize);
          tr.insert(
            insertPos,
            state.schema.nodes.pageNode.create(
              {
                pageNumber: currentPageNumber + 1,
                pageSetup: { ...currentPageSetup },
              },
              [
                state.schema.nodes.pageBody.create(null, contentAfter),
              ]
            )
          );

          // Update page numbers for subsequent pages.
          // Skip the newly inserted pageNode — it already has the correct number.
          tr.doc.nodesBetween(
            insertPos + 1,
            tr.doc.content.size,
            (node, pos) => {
              if (node.type.name === "pageNode") {
                if (pos === insertPos) return false;
                const pn = (node.attrs.pageNumber as number) ?? 1;
                if (pn > currentPageNumber) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    pageNumber: pn + 1,
                  });
                }
                return false;
              }
              return true;
            }
          );

          dispatch(tr);
          return true;
        },

      mergePage:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const { selection } = state;
          const { $from } = selection;

          // Find current pageNode
          let currentPagePos = -1;
          let currentPageNode = state.doc;
          for (let d = $from.depth; d >= 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "pageNode") {
              currentPagePos = $from.before(d);
              currentPageNode = node;
              break;
            }
          }

          if (currentPagePos < 0 || !currentPageNode) return false;

          // Find next pageNode
          let nextPagePos = -1;
          let nextPageNode = state.doc;
          state.doc.nodesBetween(
            currentPagePos + currentPageNode.nodeSize,
            state.doc.content.size,
            (node, pos) => {
              if (node.type.name === "pageNode" && nextPagePos < 0) {
                nextPagePos = pos;
                nextPageNode = node;
                return false; // stop after first match
              }
              return true;
            }
          );

          if (nextPagePos < 0 || !nextPageNode) return false;

          // Find pageBody nodes within both pages
          const currentPageBody = currentPageNode.childAfter(0);
          const nextPageBody = nextPageNode.childAfter(0);

          if (
            !currentPageBody.node ||
            currentPageBody.node.type.name !== "pageBody" ||
            !nextPageBody.node ||
            nextPageBody.node.type.name !== "pageBody"
          ) {
            return false;
          }

          // Merge content: current body + next body
          const mergedContent = currentPageBody.node.content.append(
            nextPageBody.node.content
          );

          // Update current pageBody with merged content.
          // Document position of the child is parentPos + 1 (opening token) + contentOffset.
          const currentPageBodyPos = currentPagePos + 1 + currentPageBody.offset;
          tr.replaceWith(
            currentPageBodyPos,
            currentPageBodyPos + currentPageBody.node.nodeSize,
            state.schema.nodes.pageBody.create(currentPageBody.node.attrs, mergedContent)
          );

          // Delete the next pageNode. Map position through prior replaceWith.
          const deletePos = tr.mapping.map(nextPagePos);
          tr.delete(deletePos, deletePos + nextPageNode.nodeSize);

          // Update page numbers for subsequent pages.
          const currentPageNumber =
            (currentPageNode.attrs.pageNumber as number) ?? 1;
          const renumberStart = tr.mapping.map(nextPagePos);
          tr.doc.nodesBetween(
            renumberStart,
            tr.doc.content.size,
            (node, pos) => {
              if (node.type.name === "pageNode") {
                const pn = (node.attrs.pageNumber as number) ?? 1;
                if (pn > currentPageNumber + 1) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    pageNumber: pn - 1,
                  });
                }
                return false;
              }
              return true;
            }
          );

          dispatch(tr);
          return true;
        },

      setPageSetup:
        (pageSetup: Partial<PageSetup>) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const { selection } = state;
          const { $from } = selection;

          // Find the current pageNode
          let pageNodePos = -1;
          let pageNode = state.doc;
          for (let d = $from.depth; d >= 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "pageNode") {
              pageNodePos = $from.before(d);
              pageNode = node;
              break;
            }
          }

          if (pageNodePos < 0 || !pageNode) return false;

          const currentSetup =
            (pageNode.attrs.pageSetup as PageSetup) ?? defaultPageSetup();
          const mergedSetup = mergePageSetup(currentSetup, pageSetup);

          tr.setNodeMarkup(pageNodePos, undefined, {
            ...pageNode.attrs,
            pageSetup: mergedSetup,
          });

          dispatch(tr);
          return true;
        },

      setDocumentPageSetup:
        (pageSetup: Partial<PageSetup>) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          let changed = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name !== "pageNode") return;
            const currentSetup =
              (node.attrs.pageSetup as PageSetup) ?? defaultPageSetup();
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              pageSetup: mergePageSetup(currentSetup, pageSetup),
            });
            changed = true;
          });

          if (!changed) return false;
          dispatch(tr);
          return true;
        },
    };
  },
});
