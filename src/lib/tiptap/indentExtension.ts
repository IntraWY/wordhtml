import { Extension } from "@tiptap/core";

// NOTE: indent is set as a runtime node attr without a formal schema definition.
// This works under ProseMirror's lenient unknown-attr policy. If we ever add a
// formal schema, addGlobalAttributes can be wired here. See plan.
export const IndentExtension = Extension.create({
  name: "indent",
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
