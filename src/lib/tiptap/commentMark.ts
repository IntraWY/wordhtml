import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * Comment mark (B5). Anchors a comment to a text span. The comment body and
 * resolved state are stored ON the mark (data-comment-*), so comments travel
 * with the document HTML (project save / history) without any store/schema
 * changes. Export strips these marks (see stripCommentsForExport).
 */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comment: {
      setComment: (attrs: {
        commentId: string;
        text: string;
        resolved?: boolean;
      }) => ReturnType;
      unsetComment: () => ReturnType;
      removeCommentById: (commentId: string) => ReturnType;
      setCommentResolved: (commentId: string, resolved: boolean) => ReturnType;
    };
  }
}

export const CommentMark = Mark.create({
  name: "comment",

  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-comment-id"),
        renderHTML: (attrs) =>
          attrs.commentId ? { "data-comment-id": attrs.commentId as string } : {},
      },
      text: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-comment-text") ?? "",
        renderHTML: (attrs) =>
          attrs.text ? { "data-comment-text": attrs.text as string } : {},
      },
      resolved: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-comment-resolved") === "true",
        renderHTML: (attrs) =>
          attrs.resolved ? { "data-comment-resolved": "true" } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "wh-comment" }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),

      unsetComment:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),

      // Remove all spans of a given comment id across the whole document.
      removeCommentById:
        (commentId) =>
        ({ tr, state, dispatch }) => {
          const markType = state.schema.marks.comment;
          if (!markType) return false;
          let changed = false;
          state.doc.descendants((node, pos) => {
            if (!node.isText) return;
            const mark = node.marks.find(
              (m) => m.type === markType && m.attrs.commentId === commentId
            );
            if (mark) {
              tr.removeMark(pos, pos + node.nodeSize, markType);
              changed = true;
            }
          });
          if (changed && dispatch) dispatch(tr);
          return changed;
        },

      // Flip the resolved flag on every span of a comment id.
      setCommentResolved:
        (commentId, resolved) =>
        ({ tr, state, dispatch }) => {
          const markType = state.schema.marks.comment;
          if (!markType) return false;
          let changed = false;
          state.doc.descendants((node, pos) => {
            if (!node.isText) return;
            const mark = node.marks.find(
              (m) => m.type === markType && m.attrs.commentId === commentId
            );
            if (mark) {
              tr.addMark(
                pos,
                pos + node.nodeSize,
                markType.create({ ...mark.attrs, resolved })
              );
              changed = true;
            }
          });
          if (changed && dispatch) dispatch(tr);
          return changed;
        },
    };
  },
});

export interface CommentEntry {
  commentId: string;
  text: string;
  quote: string;
  resolved: boolean;
}

/**
 * Collect comments from an editor document by scanning comment marks. Adjacent
 * text nodes sharing a comment id are merged into one entry (quote concatenated).
 */
export function collectComments(doc: {
  descendants: (
    cb: (node: {
      isText: boolean;
      text?: string | null;
      marks: readonly { type: { name: string }; attrs: Record<string, unknown> }[];
    }) => void
  ) => void;
}): CommentEntry[] {
  const map = new Map<string, CommentEntry>();
  doc.descendants((node) => {
    if (!node.isText) return;
    const mark = node.marks.find((m) => m.type.name === "comment");
    if (!mark) return;
    const id = mark.attrs.commentId as string | null;
    if (!id) return;
    const existing = map.get(id);
    if (existing) {
      existing.quote += node.text ?? "";
    } else {
      map.set(id, {
        commentId: id,
        text: (mark.attrs.text as string) ?? "",
        quote: node.text ?? "",
        resolved: Boolean(mark.attrs.resolved),
      });
    }
  });
  return [...map.values()];
}

/** Remove comment spans (unwrap) from export HTML so comments never ship. */
export function stripCommentsForExport(html: string): string {
  if (!html.includes("data-comment-id")) return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("span[data-comment-id]").forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
  return doc.body.innerHTML;
}
