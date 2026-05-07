import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import type { ComponentType } from "react";

export function createImageWithAlign(
  NodeViewComponent: ComponentType<NodeViewProps>
) {
  return Image.extend({
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
          parseHTML: (el) => {
            const attr = el.getAttribute("width");
            if (attr) return attr;
            const styleW = el.style.width;
            // normalize "320px" → "320", pass "50%" through unchanged
            return styleW ? styleW.replace(/px$/, "") : null;
          },
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
          parseHTML: (el) => {
            const attr = el.getAttribute("height");
            if (attr) return attr;
            const styleH = el.style.height;
            return styleH ? styleH.replace(/px$/, "") : null;
          },
          renderHTML: (attrs) => {
            if (!attrs.height) return {};
            const h = attrs.height as string;
            return { height: h, style: `height:${h}px` };
          },
        },
      };
    },

    addNodeView() {
      // Cast needed for React 19 compat (ReactNodeViewRenderer expects ref prop)
      return ReactNodeViewRenderer(NodeViewComponent as ComponentType<any>);
    },
  }).configure({
    inline: false,
    allowBase64: true,
  });
}
