import { Node, nodeInputRule } from "@tiptap/core";
import type katex from "katex";

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

async function loadKatex(): Promise<typeof katex> {
  const mod = await import("katex");
  return mod.default;
}

export const MathEquation = Node.create<MathEquationOptions>({
  name: "mathEquation",

  group: "inline",

  inline: true,

  atom: true,

  selectable: true,

  draggable: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-latex") ?? "",
        renderHTML: (attrs) => ({
          "data-latex": attrs.latex,
        }),
      },
      inline: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-inline") !== "false",
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
      },
      {
        tag: "div[data-type=\"math-equation\"]",
        getAttrs: () => ({
          inline: false,
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { inline } = node.attrs as MathEquationAttributes;
    return [
      inline ? "span" : "div",
      {
        "data-type": "math-equation",
        ...HTMLAttributes,
        style: inline ? "display: inline-block; vertical-align: middle;" : "display: block; text-align: center; margin: 1em 0;",
      },
    ];
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const { latex, inline } = node.attrs as MathEquationAttributes;
      const dom = document.createElement(inline ? "span" : "div");

      // Apply attributes
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        dom.setAttribute(key, value as string);
      });

      dom.style.display = inline ? "inline-block" : "block";
      dom.style.cursor = "default";
      if (!inline) {
        dom.style.textAlign = "center";
        dom.style.margin = "1em 0";
      }

      // KaTeX is loaded asynchronously to avoid bundling it in the main chunk
      loadKatex().then((katex) => {
        try {
          katex.render(latex, dom, {
            throwOnError: false,
            displayMode: !inline,
            ...(this.options.katexOptions ?? {}),
          });
        } catch {
          dom.textContent = latex;
        }
      }).catch(() => {
        dom.textContent = latex;
      });

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          const next = updatedNode.attrs as MathEquationAttributes;
          if (next.latex !== node.attrs.latex || next.inline !== node.attrs.inline) {
            loadKatex().then((katex) => {
              try {
                katex.render(next.latex, dom, {
                  throwOnError: false,
                  displayMode: !next.inline,
                  ...(this.options.katexOptions ?? {}),
                });
              } catch {
                dom.textContent = next.latex;
              }
            }).catch(() => {
              dom.textContent = next.latex;
            });
          }
          return true;
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
