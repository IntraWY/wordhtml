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

  allowGapCursor: true,

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
        contenteditable: "false",
      },
    ];
  },

  renderText() {
    return "\n--- Page Break ---\n";
  },

  addNodeView() {
    return () => {
      const dom = document.createElement("div");
      dom.className = "page-break";
      dom.style.pageBreakAfter = "always";
      dom.style.margin = "16px 0";
      dom.contentEditable = "false";

      const line = document.createElement("div");
      line.style.display = "flex";
      line.style.alignItems = "center";
      line.style.gap = "8px";
      line.style.pointerEvents = "none";

      const left = document.createElement("span");
      left.style.flex = "1";
      left.style.height = "1px";
      left.style.borderTop = "1px dashed var(--color-border)";

      const label = document.createElement("span");
      label.textContent = "ตัวแบ่งหน้า (Page Break)";
      label.style.fontSize = "10px";
      label.style.color = "var(--color-muted-foreground)";
      label.style.textTransform = "uppercase";
      label.style.letterSpacing = "0.05em";
      label.style.whiteSpace = "nowrap";

      const right = document.createElement("span");
      right.style.flex = "1";
      right.style.height = "1px";
      right.style.borderTop = "1px dashed var(--color-border)";

      line.appendChild(left);
      line.appendChild(label);
      line.appendChild(right);
      dom.appendChild(line);

      return { dom };
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

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor.commands.insertPageBreak(),
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
