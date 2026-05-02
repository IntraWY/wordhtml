import { Node, nodeInputRule } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create({
  name: "pageBreak",

  group: "block",

  inline: false,

  selectable: true,

  atom: true,

  parseHTML() {
    return [
      {
        tag: "div.page-break",
      },
    ];
  },

  renderHTML() {
    return [
      "div",
      {
        class: "page-break",
        style: "page-break-after: always;",
      },
    ];
  },

  addNodeView() {
    return () => {
      const dom = document.createElement("div");
      dom.className = "page-break";
      dom.style.pageBreakAfter = "always";
      dom.style.height = "1px";
      dom.style.borderTop = "1px dashed var(--color-border)";
      dom.style.margin = "12px 0";
      dom.contentEditable = "false";
      return {
        dom,
      };
    };
  },

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name }).focus().run();
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /^---page-break---$/,
        type: this.type,
      }),
    ];
  },
});
