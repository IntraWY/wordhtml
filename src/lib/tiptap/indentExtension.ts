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
    const blockIndent = (delta: 1 | -1) =>
      this.editor.commands.command(({ tr, state }) => {
        const { from, to } = state.selection;
        let handled = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            const current = (node.attrs.indent as number) ?? 0;
            const next = current + delta;
            if (next >= 0 && next <= 8) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
              handled = true;
            }
          }
        });
        return handled;
      });

    return {
      Tab: () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.sinkListItem("listItem");
        }
        const { selection } = this.editor.state;
        // cursor mid-text (not at start, no range selection) → insert tab stop
        if (selection.empty && selection.$from.parentOffset > 0) {
          return this.editor.commands.insertContent("    ");
        }
        // cursor at start of paragraph or range selected → block indent
        return blockIndent(1);
      },

      "Shift-Tab": () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.liftListItem("listItem");
        }
        return blockIndent(-1);
      },
    };
  },
});
