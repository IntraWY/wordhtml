import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      setIndent: (marginLeft: number, textIndent: number) => ReturnType;
    };
  }
}

export const IndentExtension = Extension.create({
  name: "indent",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          marginLeft: {
            default: 0,
            renderHTML: (attrs) => {
              const v = attrs.marginLeft as number;
              if (!v) return {};
              return { style: `margin-left:${v}cm` };
            },
            parseHTML: (el) => {
              // Legacy: data-indent="N" → N × 0.5 cm
              const legacy = el.getAttribute("data-indent");
              if (legacy) return parseInt(legacy, 10) * 0.5;
              return parseFloat(el.style.marginLeft) || 0;
            },
          },
          textIndent: {
            default: 0,
            renderHTML: (attrs) => {
              const v = attrs.textIndent as number;
              if (!v) return {};
              return { style: `text-indent:${v}cm` };
            },
            parseHTML: (el) => {
              if (el.getAttribute("data-indent")) return 0;
              return parseFloat(el.style.textIndent) || 0;
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setIndent:
        (marginLeft: number, textIndent: number) =>
        ({ tr, state }) => {
          const { from, to } = state.selection;
          let handled = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading"
            ) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                marginLeft,
                textIndent,
              });
              handled = true;
            }
          });
          return handled;
        },
    };
  },

  addKeyboardShortcuts() {
    const blockIndent = (delta: number) =>
      this.editor.commands.command(({ tr, state }) => {
        const { from, to } = state.selection;
        let handled = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (
            node.type.name === "paragraph" ||
            node.type.name === "heading"
          ) {
            const current = (node.attrs.marginLeft as number) ?? 0;
            const next = Math.max(0, Math.round((current + delta) * 10) / 10);
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              marginLeft: next,
            });
            handled = true;
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
          return this.editor.commands.insertContent("    ");
        }
        // cursor at start of paragraph or range selected → block indent
        return blockIndent(0.5);
      },

      "Shift-Tab": () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.liftListItem("listItem");
        }
        return blockIndent(-0.5);
      },
    };
  },
});
