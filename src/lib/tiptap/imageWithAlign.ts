import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import type { ComponentType, RefObject } from "react";

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
        // Free-floating image (Word-style "in front of text"): position:absolute
        // anchored to the page (.page-node). The `float` attribute owns the whole
        // positioning style; posX/posY/zIndex are data holders parsed from the
        // inline style and rendered back through `float` so the style string stays
        // a single coherent fragment.
        float: {
          default: null,
          parseHTML: (el) =>
            el.getAttribute("data-float") === "true" ||
            el.style.position === "absolute"
              ? true
              : null,
          renderHTML: (attrs) => {
            if (!attrs.float) return {};
            const x = Number(attrs.posX) || 0;
            const y = Number(attrs.posY) || 0;
            const z = Number(attrs.zIndex) || 5;
            return {
              "data-float": "true",
              style: `position:absolute;left:${x}px;top:${y}px;z-index:${z}`,
            };
          },
        },
        posX: {
          default: 0,
          parseHTML: (el) => {
            const v = el.style.left;
            return v ? Math.round(parseFloat(v)) || 0 : 0;
          },
          renderHTML: () => ({}),
        },
        posY: {
          default: 0,
          parseHTML: (el) => {
            const v = el.style.top;
            return v ? Math.round(parseFloat(v)) || 0 : 0;
          },
          renderHTML: () => ({}),
        },
        zIndex: {
          default: 5,
          parseHTML: (el) => {
            const v = el.style.zIndex;
            return v ? parseInt(v, 10) || 5 : 5;
          },
          renderHTML: () => ({}),
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
            // Browsers ignore width="50%" on <img>; always emit inline style.
            return w.includes("%")
              ? { width: w, style: `width:${w}` }
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
      return ReactNodeViewRenderer(
        NodeViewComponent as ComponentType<NodeViewProps & { ref: RefObject<HTMLElement | null> }>
      );
    },
  }).configure({
    inline: false,
    allowBase64: true,
  });
}
