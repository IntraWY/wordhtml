import Image from "@tiptap/extension-image";

export const ImageWithAlign = Image.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      align: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-align"),
        renderHTML: (attrs) =>
          attrs.align ? { "data-align": attrs.align as string } : {},
      },
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute("width") ?? el.style.width ?? null,
        renderHTML: (attrs) =>
          attrs.width ? { width: attrs.width as string } : {},
      },
    };
  },
}).configure({
  inline: false,
  allowBase64: true,
});
