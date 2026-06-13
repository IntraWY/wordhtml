import { Node, mergeAttributes } from "@tiptap/core";

/**
 * PageFooterNode – editable rich-text footer area inside a page node.
 *
 * Sits after `pageBody` in the `pageNode` content expression
 * (`pageHeader? pageBody pageFooter?`). Rendered absolutely inside the bottom
 * margin band (see globals.css `.page-node > .page-footer`), so it never
 * affects `.page-body` height or pagination overflow math.
 *
 * `isolating: true` keeps Backspace/Delete at the body end from joining
 * footer content into body paragraphs (and vice versa).
 */
export const PageFooterNode = Node.create({
  name: "pageFooter",

  group: "pageContent",

  content: "inline*",

  defining: true,

  isolating: true,

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
        "data-placeholder": "ท้ายกระดาษ (Footer)",
      }),
      0,
    ];
  },
});
