import { Extension } from "@tiptap/core";

export type LineHeightMode =
  | "single"
  | "oneHalf"
  | "double"
  | "atLeast"
  | "exactly"
  | "multiple";

export interface ParagraphFormatValues {
  marginLeft?: number;
  marginRight?: number;
  textIndent?: number;
  spaceBefore?: number;
  spaceAfter?: number;
  lineHeightMode?: LineHeightMode;
  lineHeight?: number | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphFormat: {
      setParagraphFormat: (values: ParagraphFormatValues) => ReturnType;
      setIndent: (marginLeft: number, textIndent: number) => ReturnType;
      setLineSpacing: (mode: LineHeightMode, value?: number) => ReturnType;
      increaseBlockIndent: () => ReturnType;
      decreaseBlockIndent: () => ReturnType;
    };
  }
}

function lineHeightFromMode(
  mode: LineHeightMode | undefined,
  value: number | undefined
): string | undefined {
  switch (mode) {
    case "single":
      return "1.15";
    case "oneHalf":
      return "1.5";
    case "double":
      return "2";
    case "atLeast":
    case "exactly":
      return value != null ? `${value}pt` : undefined;
    case "multiple":
      return value != null ? `${value}` : undefined;
    default:
      return undefined;
  }
}

function parseLineHeight(
  raw: string
): { lineHeightMode: LineHeightMode; lineHeight: number } | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "1.15") return { lineHeightMode: "single", lineHeight: 1.15 };
  if (trimmed === "1.5") return { lineHeightMode: "oneHalf", lineHeight: 1.5 };
  if (trimmed === "2") return { lineHeightMode: "double", lineHeight: 2 };
  if (trimmed.endsWith("pt")) {
    const v = parseFloat(trimmed);
    if (!Number.isNaN(v)) return { lineHeightMode: "atLeast", lineHeight: v };
  }
  if (trimmed.endsWith("%")) {
    const v = parseFloat(trimmed);
    if (!Number.isNaN(v)) return { lineHeightMode: "multiple", lineHeight: v / 100 };
  }
  const v = parseFloat(trimmed);
  if (!Number.isNaN(v)) {
    // Very large bare numbers are likely mis-parsed percentages (e.g. 150 instead of 1.5)
    if (v > 5) return { lineHeightMode: "multiple", lineHeight: v / 100 };
    return { lineHeightMode: "multiple", lineHeight: v };
  }
  return null;
}

/** Convert a CSS length value to centimetres. */
function parseCssLengthToCm(value: string): number {
  const trimmed = value.trim().toLowerCase();
  const num = parseFloat(trimmed);
  if (Number.isNaN(num)) return 0;

  if (trimmed.endsWith("cm")) return num;
  if (trimmed.endsWith("mm")) return num / 10;
  if (trimmed.endsWith("in")) return num * 2.54;
  if (trimmed.endsWith("pt")) return num * 0.0352778;
  if (trimmed.endsWith("pc")) return num * 0.423333;
  if (trimmed.endsWith("px")) return num / 37.81;

  // Unknown unit or unitless — treat as cm for backward compatibility with
  // Word HTML that sometimes omits units on zero values.
  return num;
}

export const ParagraphFormatExtension = Extension.create({
  name: "paragraphFormat",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          marginLeft: {
            default: 0,
            renderHTML: (attrs) => {
              const v = attrs.marginLeft as number;
              if (!v) return {};
              return { style: `margin-left:${v}cm` };
            },
            parseHTML: (el) => {
              const legacy = el.getAttribute("data-indent");
              if (legacy) return parseInt(legacy, 10) * 0.5;
              const raw = el.style.marginLeft;
              return raw ? parseCssLengthToCm(raw) : 0;
            },
          },
          marginRight: {
            default: 0,
            renderHTML: (attrs) => {
              const v = attrs.marginRight as number;
              if (!v) return {};
              return { style: `margin-right:${v}cm` };
            },
            parseHTML: (el) => {
              const raw = el.style.marginRight;
              return raw ? parseCssLengthToCm(raw) : 0;
            },
          },
          textIndent: {
            default: 0,
            renderHTML: (attrs) => {
              const v = attrs.textIndent as number;
              if (!v) return {};
              return { style: `text-indent:${v}cm` };
            },
            parseHTML: (el) => {
              if (el.getAttribute("data-indent")) return 0;
              const raw = el.style.textIndent;
              return raw ? parseCssLengthToCm(raw) : 0;
            },
          },
          spaceBefore: {
            default: 0,
            renderHTML: (attrs) => {
              const v = attrs.spaceBefore as number;
              if (!v) return {};
              return { style: `margin-top:${v}pt` };
            },
            parseHTML: (el) => {
              const mt = el.style.marginTop;
              if (mt && mt.endsWith("pt")) return parseFloat(mt);
              return 0;
            },
          },
          spaceAfter: {
            default: 0,
            renderHTML: (attrs) => {
              const v = attrs.spaceAfter as number;
              if (!v) return {};
              return { style: `margin-bottom:${v}pt` };
            },
            parseHTML: (el) => {
              const mb = el.style.marginBottom;
              if (mb && mb.endsWith("pt")) return parseFloat(mb);
              return 0;
            },
          },
          lineHeightMode: {
            default: null,
            renderHTML: (attrs) => {
              const mode = attrs.lineHeightMode as LineHeightMode | undefined;
              const value = attrs.lineHeight as number | undefined;
              const css = lineHeightFromMode(mode, value);
              if (!css) return {};
              return { style: `line-height:${css}` };
            },
            parseHTML: (el) => {
              const lh = el.style.lineHeight;
              if (!lh) return null;
              const parsed = parseLineHeight(lh);
              return parsed?.lineHeightMode ?? null;
            },
          },
          lineHeight: {
            default: null,
            renderHTML: () => ({}),
            parseHTML: (el) => {
              const lh = el.style.lineHeight;
              if (!lh) return null;
              const parsed = parseLineHeight(lh);
              return parsed?.lineHeight ?? null;
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphFormat:
        (values: ParagraphFormatValues) =>
        ({ tr, state }) => {
          const { from, to } = state.selection;
          let handled = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading"
            ) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                ...values,
              });
              handled = true;
            }
          });
          return handled;
        },
      setIndent:
        (marginLeft: number, textIndent: number) =>
        ({ tr, state }) => {
          const { from, to } = state.selection;
          let handled = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading"
            ) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                marginLeft,
                textIndent,
              });
              handled = true;
            }
          });
          return handled;
        },
      setLineSpacing:
        (mode: LineHeightMode, value?: number) =>
        ({ tr, state }) => {
          const { from, to } = state.selection;
          let handled = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading"
            ) {
              const update: ParagraphFormatValues = {
                ...node.attrs,
                lineHeightMode: mode,
              };
              if (mode === "single" || mode === "oneHalf" || mode === "double") {
                update.lineHeight = null;
              } else {
                update.lineHeight = value ?? null;
              }
              tr.setNodeMarkup(pos, undefined, update);
              handled = true;
            }
          });
          return handled;
        },
      increaseBlockIndent:
        () =>
        ({ tr, state }) => {
          const { from, to } = state.selection;
          let handled = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading"
            ) {
              const current = (node.attrs.marginLeft as number) ?? 0;
              const next = Math.round((current + 0.5) * 10) / 10;
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                marginLeft: next,
              });
              handled = true;
            }
          });
          return handled;
        },
      decreaseBlockIndent:
        () =>
        ({ tr, state }) => {
          const { from, to } = state.selection;
          let handled = false;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (
              node.type.name === "paragraph" ||
              node.type.name === "heading"
            ) {
              const current = (node.attrs.marginLeft as number) ?? 0;
              const next = Math.max(0, Math.round((current - 0.5) * 10) / 10);
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                marginLeft: next,
              });
              handled = true;
            }
          });
          return handled;
        },
    };
  },

  addKeyboardShortcuts() {
    const blockIndent = (delta: number) =>
      this.editor.commands.command(({ tr, state }) => {
        const { from, to } = state.selection;
        let handled = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (
            node.type.name === "paragraph" ||
            node.type.name === "heading"
          ) {
            const current = (node.attrs.marginLeft as number) ?? 0;
            const next = Math.max(0, Math.round((current + delta) * 10) / 10);
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              marginLeft: next,
            });
            handled = true;
          }
        });
        return handled;
      });

    return {
      Tab: () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.sinkListItem("listItem");
        }
        const { selection } = this.editor.state;
        if (selection.empty && selection.$from.parentOffset > 0) {
          return this.editor.commands.insertContent("    ");
        }
        return blockIndent(0.5);
      },

      "Shift-Tab": () => {
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.liftListItem("listItem");
        }
        return blockIndent(-0.5);
      },

    };
  },
});
