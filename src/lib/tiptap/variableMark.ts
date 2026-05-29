import { Mark } from "@tiptap/core";

export const VariableMark = Mark.create({
  name: "variable",

  inclusive: false,

  parseHTML() {
    return [
      {
        tag: "span.variable-badge",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const variable = el.getAttribute("data-variable");
          if (!variable) return false;
          return { name: variable };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, mark }) {
    const name = (mark.attrs.name as string) ?? "";
    return [
      "span",
      {
        class: "variable-badge",
        "data-variable": name,
        ...HTMLAttributes,
      },
      0,
    ];
  },

  addAttributes() {
    return {
      name: {
        default: null,
      },
    };
  },

});
