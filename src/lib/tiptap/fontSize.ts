import { Mark } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    // Declaration matches @tiptap/extension-text-style's FontSize signature exactly.
    // Our implementation converts the string (e.g. "16" or "16px") to px number internally.
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
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
        (fontSize: string) =>
        ({ chain }) => {
          const px = parseFloat(fontSize);
          if (Number.isNaN(px)) return false;
          return chain().setMark("fontSize", { size: px }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().unsetMark("fontSize").run();
        },
    };
  },
});
