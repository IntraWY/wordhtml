import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * PageHeaderFooter – commands + editing affordance for per-page editable
 * headers/footers (Phase 3 A1).
 *
 * Commands operate on the page node containing the selection; pass
 * `{ allPages: true }` to apply to every page in the document.
 *
 * The ProseMirror plugin adds:
 * - an `hf-editing` node decoration on the header/footer that contains the
 *   selection (drives the dashed-outline editing affordance in globals.css);
 * - a dblclick handler that places the caret inside a header/footer when the
 *   user double-clicks its region (covers the "empty header is hard to click
 *   into" case without any NodeView).
 */

export interface HeaderFooterCommandOptions {
  /** Apply to every page instead of only the current page. */
  allPages?: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageHeaderFooter: {
      insertPageHeader: (options?: HeaderFooterCommandOptions) => ReturnType;
      insertPageFooter: (options?: HeaderFooterCommandOptions) => ReturnType;
      removePageHeader: (options?: HeaderFooterCommandOptions) => ReturnType;
      removePageFooter: (options?: HeaderFooterCommandOptions) => ReturnType;
    };
  }
}

interface PageRef {
  pos: number;
  node: PMNode;
}

/** Every pageNode in the doc, in document order. */
function collectPages(doc: PMNode): PageRef[] {
  const pages: PageRef[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "pageNode") {
      pages.push({ pos, node });
      return false;
    }
    return true;
  });
  return pages;
}

/** The pageNode containing the selection (or null). */
function currentPage(state: EditorState): PageRef | null {
  const { $from } = state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "pageNode") {
      return { pos: d === 0 ? 0 : $from.before(d), node };
    }
  }
  return null;
}

function targetPages(state: EditorState, allPages: boolean): PageRef[] {
  if (allPages) return collectPages(state.doc);
  const page = currentPage(state);
  return page ? [page] : [];
}

export function findHeaderChild(page: PMNode): { node: PMNode; offset: number } | null {
  const first = page.firstChild;
  if (first && first.type.name === "pageHeader") return { node: first, offset: 0 };
  return null;
}

export function findFooterChild(page: PMNode): { node: PMNode; offset: number } | null {
  const last = page.lastChild;
  if (last && last.type.name === "pageFooter") {
    return { node: last, offset: page.content.size - last.nodeSize };
  }
  return null;
}

type Kind = "header" | "footer";

function insertHeaderFooter(
  state: EditorState,
  tr: Transaction,
  kind: Kind,
  allPages: boolean
): boolean {
  const nodeType =
    kind === "header" ? state.schema.nodes.pageHeader : state.schema.nodes.pageFooter;
  if (!nodeType) return false;

  const pages = targetPages(state, allPages);
  if (pages.length === 0) return false;

  let inserted = 0;
  let firstInsertPos = -1;

  // Descending order: earlier insertions don't shift later positions.
  for (const page of [...pages].sort((a, b) => b.pos - a.pos)) {
    const existing =
      kind === "header" ? findHeaderChild(page.node) : findFooterChild(page.node);
    if (existing) continue;

    const insertPos =
      kind === "header"
        ? page.pos + 1 // right after the pageNode opening token
        : page.pos + page.node.nodeSize - 1; // right before the closing token
    tr.insert(insertPos, nodeType.create());
    inserted++;
    firstInsertPos = insertPos;
  }

  if (inserted === 0) return false;

  // Single-page insert: drop the caret into the new region for typing.
  if (!allPages && firstInsertPos >= 0) {
    try {
      tr.setSelection(TextSelection.near(tr.doc.resolve(firstInsertPos + 1)));
    } catch {
      /* keep current selection */
    }
  }
  return true;
}

function removeHeaderFooter(
  state: EditorState,
  tr: Transaction,
  kind: Kind,
  allPages: boolean
): boolean {
  const pages = targetPages(state, allPages);
  if (pages.length === 0) return false;

  let removed = 0;
  for (const page of [...pages].sort((a, b) => b.pos - a.pos)) {
    const child =
      kind === "header" ? findHeaderChild(page.node) : findFooterChild(page.node);
    if (!child) continue;
    const from = page.pos + 1 + child.offset;
    tr.delete(from, from + child.node.nodeSize);
    removed++;
  }
  return removed > 0;
}

/** True when the selection's current page has a header / footer. */
export function pageHasHeader(state: EditorState): boolean {
  const page = currentPage(state);
  return !!page && !!findHeaderChild(page.node);
}

export function pageHasFooter(state: EditorState): boolean {
  const page = currentPage(state);
  return !!page && !!findFooterChild(page.node);
}

const editingDecorationKey = new PluginKey("pageHeaderFooterEditing");

function editingDecorations(state: EditorState): DecorationSet {
  const { $from } = state.selection;
  for (let d = $from.depth; d >= 1; d--) {
    const node = $from.node(d);
    if (node.type.name === "pageHeader" || node.type.name === "pageFooter") {
      const pos = $from.before(d);
      return DecorationSet.create(state.doc, [
        Decoration.node(pos, pos + node.nodeSize, { class: "hf-editing" }),
      ]);
    }
  }
  return DecorationSet.empty;
}

export const PageHeaderFooter = Extension.create({
  name: "pageHeaderFooter",

  addCommands() {
    return {
      insertPageHeader:
        (options = {}) =>
        ({ state, tr, dispatch }) => {
          const ok = insertHeaderFooter(state, tr, "header", options.allPages ?? false);
          if (ok && dispatch) dispatch(tr);
          return ok;
        },
      insertPageFooter:
        (options = {}) =>
        ({ state, tr, dispatch }) => {
          const ok = insertHeaderFooter(state, tr, "footer", options.allPages ?? false);
          if (ok && dispatch) dispatch(tr);
          return ok;
        },
      removePageHeader:
        (options = {}) =>
        ({ state, tr, dispatch }) => {
          const ok = removeHeaderFooter(state, tr, "header", options.allPages ?? false);
          if (ok && dispatch) dispatch(tr);
          return ok;
        },
      removePageFooter:
        (options = {}) =>
        ({ state, tr, dispatch }) => {
          const ok = removeHeaderFooter(state, tr, "footer", options.allPages ?? false);
          if (ok && dispatch) dispatch(tr);
          return ok;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: editingDecorationKey,
        props: {
          decorations: (state) => editingDecorations(state),
          handleDOMEvents: {
            dblclick: (view, event) => {
              const target = event.target as HTMLElement | null;
              const region = target?.closest?.(".page-header, .page-footer");
              if (!region || !view.dom.contains(region)) return false;
              try {
                // posAtDOM(region, 0) resolves to the region's start boundary.
                // For an EMPTY header that boundary sits *between* the header and
                // body, and `TextSelection.near` with no bias can snap forward
                // into the body — landing the caret in the wrong region. Bias
                // forward by one position (into the header's inline content) and
                // search forward (dir +1) so the caret stays inside the region.
                const start = view.posAtDOM(region, 0);
                const $inside = view.state.doc.resolve(
                  Math.min(start + 1, view.state.doc.content.size)
                );
                const selection = TextSelection.near($inside, 1);
                view.dispatch(view.state.tr.setSelection(selection));
                view.focus();
                return true;
              } catch {
                return false;
              }
            },
          },
        },
      }),
    ];
  },
});
