import { Extension } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import type { Transaction } from "@tiptap/pm/state";
import { PX_PER_CM } from "@/lib/page";

function applyToSelectedBlocks(
  state: EditorState,
  tr: Transaction,
  patch: (attrs: Record<string, unknown>) => Record<string, unknown>
): boolean {
  const { from, to, $from } = state.selection;
  if (from === to) {
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === "paragraph" || node.type.name === "heading") {
        tr.setNodeMarkup($from.before(d), undefined, patch({ ...node.attrs }));
        return true;
      }
    }
    return false;
  }
  let handled = false;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === "paragraph" || node.type.name === "heading") {
      tr.setNodeMarkup(pos, undefined, patch({ ...node.attrs }));
      handled = true;
    }
  });
  return handled;
}

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

export function lineHeightFromMode(
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

export function parseLineHeight(
  raw: string
): { lineHeightMode: LineHeightMode; lineHeight: number } | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "1.15") return { lineHeightMode: "single", lineHeight: 1.15 };
  if (trimmed === "1.5") return { lineHeightMode: "oneHalf", lineHeight: 1.5 };
  if (trimmed === "2") return { lineHeightMode: "double", lineHeight: 2 };
  if (trimmed.endsWith("pt")) {
    const v = parseFloat(trimmed);
    if (!Number.isNaN(v) && v > 0 && v <= 1000) {
      return { lineHeightMode: "atLeast", lineHeight: v };
    }
  }
  if (trimmed.endsWith("%")) {
    const v = parseFloat(trimmed);
    if (!Number.isNaN(v) && v > 0 && v <= 1000) {
      return { lineHeightMode: "multiple", lineHeight: v / 100 };
    }
  }
  const v = parseFloat(trimmed);
  if (!Number.isNaN(v) && v > 0 && v <= 1000) {
    // Very large bare numbers are likely mis-parsed percentages (e.g. 150 instead of 1.5)
    if (v > 5) return { lineHeightMode: "multiple", lineHeight: v / 100 };
    return { lineHeightMode: "multiple", lineHeight: v };
  }
  return null;
}

/** Convert a CSS length value to centimetres. */
/** Merge paragraph/heading inline styles so getHTML does not drop margin-left. */
export function buildParagraphStyle(
  attrs: Record<string, unknown>
): string | undefined {
  const parts: string[] = [];

  const marginLeft = (attrs.marginLeft as number) ?? 0;
  if (marginLeft) parts.push(`margin-left:${marginLeft}cm`);

  const marginRight = (attrs.marginRight as number) ?? 0;
  if (marginRight) parts.push(`margin-right:${marginRight}cm`);

  const textIndent = (attrs.textIndent as number) ?? 0;
  if (textIndent) parts.push(`text-indent:${textIndent}cm`);

  const spaceBefore = (attrs.spaceBefore as number) ?? 0;
  if (spaceBefore) parts.push(`margin-top:${spaceBefore}pt`);

  const spaceAfter = (attrs.spaceAfter as number) ?? 0;
  if (spaceAfter) parts.push(`margin-bottom:${spaceAfter}pt`);

  const lh = lineHeightFromMode(
    attrs.lineHeightMode as LineHeightMode | undefined,
    attrs.lineHeight as number | undefined
  );
  if (lh) parts.push(`line-height:${lh}`);

  return parts.length > 0 ? parts.join(";") : undefined;
}

export function parseCssLengthToCm(value: string): number {
  const trimmed = value.trim().toLowerCase();
  const num = parseFloat(trimmed);
  if (Number.isNaN(num) || num < 0) return 0;

  if (trimmed.endsWith("cm")) return num;
  if (trimmed.endsWith("mm")) return num / 10;
  if (trimmed.endsWith("in")) return num * 2.54;
  if (trimmed.endsWith("pt")) return num * 0.0352778;
  if (trimmed.endsWith("pc")) return num * 0.423333;
  if (trimmed.endsWith("px")) return num / PX_PER_CM;

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
              const style = buildParagraphStyle(attrs);
              return style ? { style } : {};
            },
            parseHTML: (el): number => {
              const legacy = el.getAttribute("data-indent");
              if (legacy) return parseInt(legacy, 10) * 0.5;
              const raw = el.style.marginLeft;
              return raw ? parseCssLengthToCm(raw) : 0;
            },
          },
          marginRight: {
            default: 0,
            renderHTML: () => ({}),
            parseHTML: (el): number => {
              const raw = el.style.marginRight;
              return raw ? parseCssLengthToCm(raw) : 0;
            },
          },
          textIndent: {
            default: 0,
            renderHTML: () => ({}),
            parseHTML: (el): number => {
              if (el.getAttribute("data-indent")) return 0;
              const raw = el.style.textIndent;
              return raw ? parseCssLengthToCm(raw) : 0;
            },
          },
          spaceBefore: {
            default: 0,
            renderHTML: () => ({}),
            parseHTML: (el): number => {
              const mt = el.style.marginTop;
              if (mt && mt.endsWith("pt")) return parseFloat(mt);
              return 0;
            },
          },
          spaceAfter: {
            default: 0,
            renderHTML: () => ({}),
            parseHTML: (el): number => {
              const mb = el.style.marginBottom;
              if (mb && mb.endsWith("pt")) return parseFloat(mb);
              return 0;
            },
          },
          lineHeightMode: {
            default: null,
            renderHTML: () => ({}),
            parseHTML: (el): LineHeightMode | null => {
              const lh = el.style.lineHeight;
              if (!lh) return null;
              const parsed = parseLineHeight(lh);
              return parsed?.lineHeightMode ?? null;
            },
          },
          lineHeight: {
            default: null,
            renderHTML: () => ({}),
            parseHTML: (el): number | null => {
              const lh = el.style.lineHeight;
              if (!lh) return null;
              const parsed = parseLineHeight(lh);
              return parsed?.lineHeight ?? null;
            },
          },
          // Marks a paragraph as one piece of an auto-split long paragraph.
          // Pagination splits over-tall paragraphs across pages; export
          // (stripPaginationWrappers) re-joins adjacent soft-split pieces.
          softSplit: {
            default: false,
            renderHTML: (attrs) =>
              attrs.softSplit ? { "data-soft-split": "true" } : {},
            parseHTML: (el): boolean =>
              el.getAttribute("data-soft-split") === "true",
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphFormat:
        (values: ParagraphFormatValues) =>
        ({ tr, state }) =>
          applyToSelectedBlocks(state, tr, (attrs) => ({ ...attrs, ...values })),
      setIndent:
        (marginLeft: number, textIndent: number) =>
        ({ tr, state }) =>
          applyToSelectedBlocks(state, tr, (attrs) => ({
            ...attrs,
            marginLeft,
            textIndent,
          })),
      setLineSpacing:
        (mode: LineHeightMode, value?: number) =>
        ({ tr, state }) =>
          applyToSelectedBlocks(state, tr, (attrs) => {
            const update: ParagraphFormatValues = {
              ...attrs,
              lineHeightMode: mode,
            };
            if (mode === "single" || mode === "oneHalf" || mode === "double") {
              update.lineHeight = null;
            } else {
              update.lineHeight = value ?? null;
            }
            return update as Record<string, unknown>;
          }),
      increaseBlockIndent:
        () =>
        ({ tr, state }) =>
          applyToSelectedBlocks(state, tr, (attrs) => {
            const current = (attrs.marginLeft as number) ?? 0;
            const next = Math.round((current + 0.5) * 10) / 10;
            return { ...attrs, marginLeft: next };
          }),
      decreaseBlockIndent:
        () =>
        ({ tr, state }) =>
          applyToSelectedBlocks(state, tr, (attrs) => {
            const current = (attrs.marginLeft as number) ?? 0;
            const next = Math.max(0, Math.round((current - 0.5) * 10) / 10);
            return { ...attrs, marginLeft: next };
          }),
    };
  },

  addKeyboardShortcuts() {
    const blockIndent = (delta: number) =>
      this.editor.commands.command(({ tr, state }) =>
        applyToSelectedBlocks(state, tr, (attrs) => {
          const current = (attrs.marginLeft as number) ?? 0;
          const next = Math.max(0, Math.round((current + delta) * 10) / 10);
          return { ...attrs, marginLeft: next };
        })
      );

    return {
      Tab: () => {
        if (this.editor.isActive("codeBlock")) {
          return this.editor.commands.insertContent("    ");
        }
        if (this.editor.isActive("listItem")) {
          return this.editor.commands.sinkListItem("listItem");
        }
        const { selection } = this.editor.state;
        if (selection.empty) {
          const { $from } = selection;
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              return blockIndent(0.5);
            }
          }
        }
        return false;
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
