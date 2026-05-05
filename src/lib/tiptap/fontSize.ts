import { Mark } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: number) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Mark.create({
  name: "fontSize",

  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => {
          const size = element.style.fontSize;
          if (!size) return null;
          const px = parseFloat(size);
          return Number.isNaN(px) ? null : px;
        },
        renderHTML: (attributes) => {
          if (!attributes.size) return {};
          return { style: `font-size:${attributes.size}px` };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const size = element.style.fontSize;
          if (!size) return false;
          return {};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", { style: HTMLAttributes.style }, 0];
  },

  addCommands() {
    return {
      setFontSize:
        (size: number) =>
        ({ chain }) => {
          return chain().setMark("fontSize", { size }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().unsetMark("fontSize").run();
        },
    };
  },
});
