import { Node, mergeAttributes } from "@tiptap/core";

/**
 * PageHeaderNode – placeholder header area inside a page node.
 *
 * Phase 1: This is a structural placeholder. Rich-text header/footer
 * editing will be implemented in Phase 2.
 */
export const PageHeaderNode = Node.create({
  name: "pageHeader",

  group: "pageContent",

  content: "inline*",

  defining: true,

  isolating: false,

  parseHTML() {
    return [
      {
        tag: "div[data-page-header]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "page-header",
        "data-page-header": "true",
        contenteditable: "false",
      }),
      0,
    ];
  },
});
