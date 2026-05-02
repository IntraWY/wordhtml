import { TableRow } from "@tiptap/extension-table";

export const RepeatingRow = TableRow.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      dataRepeat: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-repeat") === "true",
        renderHTML: (attrs) => {
          if (!attrs.dataRepeat) return {};
          return { "data-repeat": "true" };
        },
      },
      dataRepeatSource: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-repeat-source") ?? null,
        renderHTML: (attrs) => {
          if (!attrs.dataRepeatSource) return {};
          return { "data-repeat-source": attrs.dataRepeatSource as string };
        },
      },
    };
  },
});
