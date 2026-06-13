import { Node, mergeAttributes } from "@tiptap/core";

/**
 * PageHeaderNode – editable rich-text header area inside a page node.
 *
 * Sits before `pageBody` in the `pageNode` content expression
 * (`pageHeader? pageBody pageFooter?`). Rendered absolutely inside the top
 * margin band (see globals.css `.page-node > .page-header`), so it never
 * affects `.page-body` height or pagination overflow math.
 *
 * `isolating: true` keeps Backspace/Delete at the body start from joining
 * body paragraphs into the header (and vice versa).
 */
export const PageHeaderNode = Node.create({
  name: "pageHeader",

  group: "pageContent",

  content: "inline*",

  defining: true,

  isolating: true,

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
        "data-placeholder": "หัวกระดาษ (Header)",
      }),
      0,
    ];
  },
});
