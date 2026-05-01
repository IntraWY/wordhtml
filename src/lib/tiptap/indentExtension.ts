import { Extension } from "@tiptap/core";

export const IndentExtension = Extension.create({
  name: "indent",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            renderHTML: (attrs) => {
              const level = attrs.indent as number;
              if (!level || level === 0) return {};
              return { "data-indent": String(level) };
            },
            parseHTML: (element) => ({
              indent: parseInt(element.getAttribute("data-indent") ?? "0", 10),
            }),
          },
        },
      },
    ];
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.sinkListItem("listItem");
        }
        return this.editor.commands.command(({ tr, state }) => {
          const { selection } = state;
          const { from, to } = selection;
          let handled = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              const currentIndent = (node.attrs.indent as number) ?? 0;
              if (currentIndent < 8) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: currentIndent + 1 });
                handled = true;
              }
            }
          });
          return handled;
        });
      },
      "Shift-Tab": () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.liftListItem("listItem");
        }
        return this.editor.commands.command(({ tr, state }) => {
          const { selection } = state;
          const { from, to } = selection;
          let handled = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              const currentIndent = (node.attrs.indent as number) ?? 0;
              if (currentIndent > 0) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: currentIndent - 1 });
                handled = true;
              }
            }
          });
          return handled;
        });
      },
    };
  },
});
