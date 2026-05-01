import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageResizeView } from "@/components/editor/ImageResizeView";

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
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          const w = attrs.width as string;
          // % widths: just the attribute; px widths: also inline style
          return w.includes("%")
            ? { width: w }
            : { width: w, style: `width:${w}px` };
        },
      },
      height: {
        default: null,
        parseHTML: (el) => el.getAttribute("height") ?? null,
        renderHTML: (attrs) => {
          if (!attrs.height) return {};
          const h = attrs.height as string;
          return { height: h, style: `height:${h}px` };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageResizeView);
  },
}).configure({
  inline: false,
  allowBase64: true,
});
