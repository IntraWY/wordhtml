import { Node, mergeAttributes } from "@tiptap/core";

export type PageBodyNodeOptions = object;

export interface PageBodyNodeAttributes {
  class?: string;
}

/**
 * PageBodyNode – content container within a page.
 *
 * Restricts content to valid document block nodes (paragraph, heading,
 * bulletList, orderedList, image, table, pageBreak, mathEquation, etc.).
 *
 * Renders as a `<div class="page-body" data-page-body="true">` so the
 * layout engine can measure it with ResizeObserver.
 */
export const PageBodyNode = Node.create<PageBodyNodeOptions>({
  name: "pageBody",

  group: "pageContent",

  content: "(block | pageBreak)+",

  defining: true,

  isolating: false,

  parseHTML() {
    return [
      {
        tag: "div[data-page-body]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "page-body",
        "data-page-body": "true",
      }),
      0,
    ];
  },
});
