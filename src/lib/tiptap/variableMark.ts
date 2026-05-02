import { Mark, markInputRule } from "@tiptap/core";

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
      `{{${name}}}`,
    ];
  },

  addAttributes() {
    return {
      name: {
        default: null,
      },
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: /\{\{([\w\u0E00-\u0E7F_]+)\}\}/g,
        type: this.type,
        getAttributes: (match) => ({
          name: match[1],
        }),
      }),
    ];
  },
});
