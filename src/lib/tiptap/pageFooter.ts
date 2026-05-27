import { Node, mergeAttributes } from "@tiptap/core";

/**
 * PageFooterNode – placeholder footer area inside a page node.
 *
 * Phase 1: This is a structural placeholder. Rich-text header/footer
 * editing will be implemented in Phase 2.
 */
export const PageFooterNode = Node.create({
  name: "pageFooter",

  group: "pageContent",

  content: "inline*",

  defining: true,

  isolating: false,

  parseHTML() {
    return [
      {
        tag: "div[data-page-footer]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "page-footer",
        "data-page-footer": "true",
        contenteditable: "true",
      }),
      0,
    ];
  },
});
