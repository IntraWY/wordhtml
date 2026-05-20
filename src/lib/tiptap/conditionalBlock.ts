import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    conditionalBlock: {
      setCondition: (condition: string) => ReturnType;
      clearCondition: () => ReturnType;
    };
  }
}

export const ConditionalBlockExtension = Extension.create({
  name: "conditionalBlock",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "table"],
        attributes: {
          condition: {
            default: null,
            renderHTML: (attrs) => {
              const condition = attrs.condition as string | null;
              if (!condition) return {};
              return { "data-condition": condition };
            },
            parseHTML: (el) => {
              const raw = el.getAttribute("data-condition");
              return raw ?? null;
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setCondition:
        (condition: string) =>
        ({ tr, state }) => {
          const { from, to } = state.selection;
          let handled = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading" ||
              node.type.name === "table"
            ) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                condition,
              });
              handled = true;
            }
          });
          return handled;
        },
      clearCondition:
        () =>
        ({ tr, state }) => {
          const { from, to } = state.selection;
          let handled = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading" ||
              node.type.name === "table"
            ) {
              const update = { ...node.attrs };
              delete update.condition;
              tr.setNodeMarkup(pos, undefined, update);
              handled = true;
            }
          });
          return handled;
        },
    };
  },
});
