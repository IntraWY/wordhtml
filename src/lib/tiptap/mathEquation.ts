import { Node, nodeInputRule } from "@tiptap/core";
import katex from "katex";

export interface MathEquationOptions {
  /** KaTeX render options passed to katex.render */
  katexOptions?: katex.KatexOptions;
}

export interface MathEquationAttributes {
  latex: string;
  inline: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathEquation: {
      insertMathEquation: (attrs: MathEquationAttributes) => ReturnType;
    };
  }
}

const INPUT_RULE_INLINE = /\$\$([^$]+)\$\$/;
const INPUT_RULE_BLOCK = /\$\$\$\$([^$]+)\$\$\$\$/;

export const MathEquation = Node.create<MathEquationOptions>({
  name: "mathEquation",

  group: "inline block",

  inline: false,

  atom: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      latex: {
        default: "",
      },
      inline: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-inline") === "true",
        renderHTML: (attrs) => ({
          "data-inline": String(attrs.inline),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-type=\"math-equation\"]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const latex = el.getAttribute("data-latex");
          if (!latex) return false;
          return {
            latex,
            inline: el.getAttribute("data-inline") === "true",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { latex, inline } = node.attrs as MathEquationAttributes;
    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: !inline,
        ...(this.options.katexOptions ?? {}),
      });
      const wrapper = document.createElement("span");
      wrapper.innerHTML = html;
      const first = wrapper.firstElementChild;
      if (first) {
        first.setAttribute("data-type", "math-equation");
        first.setAttribute("data-latex", latex);
        first.setAttribute("data-inline", String(inline));
        return first.outerHTML as unknown as [string, Record<string, unknown>, ...unknown[]];
      }
    } catch {
      // fall through to plain fallback
    }
    return [
      "span",
      {
        "data-type": "math-equation",
        "data-latex": latex,
        "data-inline": String(inline),
        ...HTMLAttributes,
      },
      latex,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const { latex, inline } = node.attrs as MathEquationAttributes;
      const dom = document.createElement(inline ? "span" : "div");
      dom.setAttribute("data-type", "math-equation");
      dom.setAttribute("data-latex", latex);
      dom.setAttribute("data-inline", String(inline));
      dom.style.display = inline ? "inline-block" : "block";
      dom.style.cursor = "default";
      try {
        katex.render(latex, dom, {
          throwOnError: false,
          displayMode: !inline,
          ...(this.options.katexOptions ?? {}),
        });
      } catch {
        dom.textContent = latex;
      }
      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          const next = updatedNode.attrs as MathEquationAttributes;
          if (next.latex === latex && next.inline === inline) return true;
          return false;
        },
      };
    };
  },

  addCommands() {
    return {
      insertMathEquation:
        (attrs: MathEquationAttributes) =>
        ({ chain }) => {
          return chain()
            .focus()
            .insertContent({ type: this.name, attrs })
            .run();
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: INPUT_RULE_BLOCK,
        type: this.type,
        getAttributes: (match) => ({
          latex: match[1],
          inline: false,
        }),
      }),
      nodeInputRule({
        find: INPUT_RULE_INLINE,
        type: this.type,
        getAttributes: (match) => ({
          latex: match[1],
          inline: true,
        }),
      }),
    ];
  },
});
