import { Extension } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import type { PageSetup } from "@/types";

/**
 * Concatenate page-body B's blocks onto body A's blocks. When A's last block and
 * B's first block are both text blocks of the same type, they are *joined* into a
 * single block (Word-style cross-page paragraph merge) instead of left as two
 * adjacent blocks — this is what makes Backspace-at-page-top / Delete-at-page-end
 * merge the boundary paragraphs rather than no-op.
 *
 * Returns the merged Fragment plus the content-relative caret target at the seam
 * (the point where A's content ends), or `null` when no seam join happened.
 */
export function joinBodyFragments(
  aContent: Fragment,
  bContent: Fragment
): { content: Fragment; seam: number | null } {
  const aLast = aContent.lastChild;
  const bFirst = bContent.firstChild;
  if (
    aLast &&
    bFirst &&
    aLast.isTextblock &&
    bFirst.isTextblock &&
    aLast.type === bFirst.type
  ) {
    const joined = aLast.copy(aLast.content.append(bFirst.content));
    const aMinusLast = aContent.cut(0, aContent.size - aLast.nodeSize);
    const bMinusFirst = bContent.cut(bFirst.nodeSize);
    const content = aMinusLast
      .append(Fragment.from(joined))
      .append(bMinusFirst);
    // Seam = inside the joined block, right after A's original content:
    //   aMinusLast.size (blocks before the joined one)
    //   + 1 (opening token of the joined block)
    //   + aLast.content.size (A's original inline content)
    const seam = aMinusLast.size + 1 + aLast.content.size;
    return { content, seam };
  }
  return { content: aContent.append(bContent), seam: null };
}

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
      mergeWithPreviousPage: () => ReturnType;
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

          // pageBody requires "(block | pageBreak)+" — a split at a block boundary
          // could yield an empty half. createAndFill backfills an empty paragraph
          // so the page is never schema-invalid / unclickable. (Defense-in-depth:
          // a caret inside a textblock already leaves an empty paragraph behind.)
          const pageBodyType = state.schema.nodes.pageBody;
          const makePageBody = (
            attrs: Record<string, unknown> | null,
            content: Fragment
          ) =>
            pageBodyType.createAndFill(attrs, content) ??
            pageBodyType.create(attrs, content);

          // Replace current pageBody with contentBefore
          tr.replaceWith(
            pageBodyPos,
            pageBodyPos + pageBodyNode.nodeSize,
            makePageBody(pageBodyNode.attrs, contentBefore)
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
              [makePageBody(null, contentAfter)]
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

          // Land the caret at the start of the new page's content (Word-style
          // Ctrl+Enter), instead of letting it map to the end of the document.
          // insertPos → pageNode open; +1 → pageBody open; resolve just inside and
          // snap to the nearest text position.
          try {
            tr.setSelection(
              TextSelection.near(tr.doc.resolve(insertPos + 2), 1)
            );
          } catch {
            // leave the mapped selection if resolution fails (defensive)
          }

          dispatch(tr);
          return true;
        },

      mergeWithPreviousPage:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const { selection } = state;
          const { $from } = selection;

          let currentPagePos = -1;
          let currentPageNode = state.doc;
          let currentPageBody = state.doc;

          for (let d = $from.depth; d >= 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "pageBody" && currentPageBody === state.doc) {
              currentPageBody = node;
            }
            if (node.type.name === "pageNode" && currentPagePos < 0) {
              currentPagePos = $from.before(d);
              currentPageNode = node;
            }
          }

          if (currentPagePos < 0 || currentPageBody === state.doc) return false;

          const currentPageNumber =
            (currentPageNode.attrs.pageNumber as number) ?? 1;
          if (currentPageNumber <= 1) return false;

          let previousPagePos = -1;
          let previousPageNode = state.doc;
          state.doc.nodesBetween(0, currentPagePos, (node, pos) => {
            if (node.type.name === "pageNode") {
              previousPagePos = pos;
              previousPageNode = node;
            }
            return true;
          });

          if (previousPagePos < 0) return false;

          const previousPageBody = previousPageNode.childAfter(0);
          if (
            !previousPageBody.node ||
            previousPageBody.node.type.name !== "pageBody"
          ) {
            return false;
          }

          const { content: mergedContent, seam } = joinBodyFragments(
            previousPageBody.node.content,
            currentPageBody.content
          );

          const previousPageBodyPos = previousPagePos + 1 + previousPageBody.offset;
          tr.replaceWith(
            previousPageBodyPos,
            previousPageBodyPos + previousPageBody.node.nodeSize,
            state.schema.nodes.pageBody.create(
              previousPageBody.node.attrs,
              mergedContent
            )
          );

          const deletePos = tr.mapping.map(currentPagePos);
          tr.delete(deletePos, deletePos + currentPageNode.nodeSize);

          // Land the caret at the seam so the join reads like a normal Backspace
          // merge (cursor sits between the two former paragraphs' text). The
          // deleted page is after this position, so it stays valid in the final doc.
          if (seam !== null) {
            const seamPos = previousPageBodyPos + 1 + seam;
            tr.setSelection(TextSelection.create(tr.doc, seamPos));
          }

          const renumberStart = tr.mapping.map(currentPagePos);
          tr.doc.nodesBetween(renumberStart, tr.doc.content.size, (node, pos) => {
            if (node.type.name === "pageNode") {
              const pn = (node.attrs.pageNumber as number) ?? 1;
              if (pn > currentPageNumber - 1) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  pageNumber: pn - 1,
                });
              }
              return false;
            }
            return true;
          });

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

          // Merge content: current body + next body, joining the boundary text
          // blocks so Delete-at-page-end pulls the next page's first line up.
          const { content: mergedContent, seam } = joinBodyFragments(
            currentPageBody.node.content,
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

          // Keep the caret at the seam (end of the current page's former last
          // line) so Delete reads like a normal forward-merge.
          if (seam !== null) {
            const seamPos = currentPageBodyPos + 1 + seam;
            tr.setSelection(TextSelection.create(tr.doc, seamPos));
          }

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
