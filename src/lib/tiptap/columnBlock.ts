import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Multi-column block (B6). Wraps a run of block content in a CSS multi-column
 * container. Treated as a single atomic block by the pagination engine (like a
 * table) — it does not split across pages, which keeps the single-column
 * fill-to-limit reflow model intact. Suited to short multi-column sections.
 */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnBlock: {
      setColumnLayout: (columns: number) => ReturnType;
      unsetColumnLayout: () => ReturnType;
    };
  }
}

export const ColumnBlock = Node.create({
  name: "columnBlock",

  group: "block",

  content: "block+",

  defining: true,

  addAttributes() {
    return {
      columns: {
        default: 2,
        parseHTML: (el) => {
          const n = parseInt(el.getAttribute("data-columns") ?? "2", 10);
          return Number.isNaN(n) || n < 2 ? 2 : Math.min(3, n);
        },
        renderHTML: (attrs) => ({ "data-columns": String(attrs.columns) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.wh-columns" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const n = (node.attrs.columns as number) || 2;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "wh-columns",
        style: `column-count:${n};column-gap:24px;`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setColumnLayout:
        (columns) =>
        ({ chain }) =>
          chain().wrapIn(this.name, { columns }).run(),

      unsetColumnLayout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
