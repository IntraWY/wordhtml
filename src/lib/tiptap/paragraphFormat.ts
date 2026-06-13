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
      setTabStops: (stops: number[]) => ReturnType;
      setTabSize: (sizeCm: number | null) => ReturnType;
    };
  }
}

// ── Custom ruler tab stops ───────────────────────────────────────────────────
//
// Word-fidelity caveats (CSS reality check):
// - Only LEFT-aligned tab stops are supported. Center/right/decimal stops are
//   out of scope — CSS `tab-size` cannot express alignment types.
// - CSS `tab-size` is a single uniform interval per element; per-position
//   stops (e.g. 1.5cm then 4cm then 8.25cm) are NOT expressible. We therefore:
//     1. store the full clicked stop list in `tabStops` (data-tab-stops) for
//        forward-compat and ruler display, and
//     2. render tabs with a per-paragraph uniform `tab-size` equal to the
//        FIRST stop (the common "first tab lands at stop 1" case is exact;
//        later tabs land on multiples of the first stop, which only matches
//        Word when the stops are evenly spaced).
// - Paragraphs without custom stops inherit the global 1.27cm grid
//   (globals.css / wrap.ts / exportPdf.ts).

/** Smallest meaningful tab stop (cm). */
export const MIN_TAB_STOP_CM = 0.25;
/** Largest tab stop we accept (cm) — wider than any supported page. */
export const MAX_TAB_STOP_CM = 50;

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Sort ascending, round to 2 decimals, clamp to valid range, dedupe. */
export function normalizeTabStops(stops: number[]): number[] {
  const valid = stops
    .filter((v) => typeof v === "number" && Number.isFinite(v))
    .map(round2)
    .filter((v) => v >= MIN_TAB_STOP_CM && v <= MAX_TAB_STOP_CM)
    .sort((a, b) => a - b);
  return valid.filter((v, i) => i === 0 || v !== valid[i - 1]);
}

/** Parse a `data-tab-stops="1.5,4,8.25"` attribute value into cm positions. */
export function parseTabStops(raw: string | null): number[] {
  if (!raw) return [];
  return normalizeTabStops(raw.split(",").map((s) => parseFloat(s)));
}

/** Serialize tab stops back to the `data-tab-stops` attribute value. */
export function serializeTabStops(stops: number[]): string {
  return normalizeTabStops(stops).join(",");
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

  // Per-paragraph uniform tab interval (cm) — overrides the global 1.27cm
  // grid. Unprefixed only: every current engine (incl. Firefox 91+) supports
  // `tab-size`, and CSSOM round-trips drop unknown `-moz-` longhands anyway.
  const tabSize = attrs.tabSize as number | null | undefined;
  if (typeof tabSize === "number" && tabSize > 0) {
    parts.push(`tab-size:${tabSize}cm`);
  }

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
          // Custom ruler tab stops (cm, left-aligned only — see module note).
          // Stored verbatim for forward-compat + ruler markers; rendering uses
          // the derived uniform `tabSize` below.
          tabStops: {
            default: [] as number[],
            renderHTML: (attrs) => {
              const stops = attrs.tabStops as number[] | undefined;
              if (!stops || stops.length === 0) return {};
              return { "data-tab-stops": serializeTabStops(stops) };
            },
            parseHTML: (el): number[] =>
              parseTabStops(el.getAttribute("data-tab-stops")),
          },
          // Uniform per-paragraph tab interval in cm (null → inherit the
          // global 1.27cm grid). Rendered as inline `tab-size` via
          // buildParagraphStyle (merged on marginLeft's renderHTML).
          tabSize: {
            default: null,
            renderHTML: () => ({}),
            parseHTML: (el): number | null => {
              const raw = el.style.getPropertyValue("tab-size");
              if (raw) {
                const cm = parseCssLengthToCm(raw);
                if (cm > 0) return Math.round(cm * 100) / 100;
              }
              // Fallback: derive from data-tab-stops (first stop) when the
              // style attribute was stripped but the data attribute survived.
              const stops = parseTabStops(el.getAttribute("data-tab-stops"));
              return stops.length > 0 ? stops[0] : null;
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
          // Marks a paragraph as a figure/table caption (B2). Styled via CSS
          // `p[data-caption]`; numbering computed at insert time (lib/caption.ts).
          captionKind: {
            default: null,
            renderHTML: (attrs) =>
              attrs.captionKind
                ? { "data-caption": attrs.captionKind as string }
                : {},
            parseHTML: (el): string | null => el.getAttribute("data-caption"),
          },
          // Marks a paragraph as a footnote/endnote entry (B1). Numbered note
          // text lives at document end; styled via CSS `p[data-footnote]`.
          footnoteIndex: {
            default: null,
            renderHTML: (attrs) =>
              attrs.footnoteIndex
                ? { "data-footnote": String(attrs.footnoteIndex) }
                : {},
            parseHTML: (el): number | null => {
              const raw = el.getAttribute("data-footnote");
              if (!raw) return null;
              const n = parseInt(raw, 10);
              return Number.isNaN(n) ? null : n;
            },
          },
          // Marks a paragraph as a bibliography entry (B9). Styled via CSS
          // `p[data-citation]`; numbering computed at insert time (lib/citations.ts).
          citationIndex: {
            default: null,
            renderHTML: (attrs) =>
              attrs.citationIndex
                ? { "data-citation": String(attrs.citationIndex) }
                : {},
            parseHTML: (el): number | null => {
              const raw = el.getAttribute("data-citation");
              if (!raw) return null;
              const n = parseInt(raw, 10);
              return Number.isNaN(n) ? null : n;
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
      // Set the full custom tab-stop list (cm) on the selected paragraphs.
      // Derives the rendered uniform `tabSize` from the FIRST stop — see the
      // Word-fidelity note at the top of this module. Empty array clears both
      // (paragraph falls back to the global 1.27cm grid).
      setTabStops:
        (stops: number[]) =>
        ({ tr, state }) => {
          const next = normalizeTabStops(stops);
          return applyToSelectedBlocks(state, tr, (attrs) => ({
            ...attrs,
            tabStops: next,
            tabSize: next.length > 0 ? next[0] : null,
          }));
        },
      // Set only the uniform tab interval (cm) without ruler stops.
      setTabSize:
        (sizeCm: number | null) =>
        ({ tr, state }) =>
          applyToSelectedBlocks(state, tr, (attrs) => ({
            ...attrs,
            tabSize:
              typeof sizeCm === "number" &&
              sizeCm >= MIN_TAB_STOP_CM &&
              sizeCm <= MAX_TAB_STOP_CM
                ? round2(sizeCm)
                : null,
          })),
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
        const editor = this.editor;
        if (editor.isActive("codeBlock")) {
          // Real tab character (was 4 spaces) — consistent with mid-line tabs.
          return editor.commands.insertContent("\t");
        }
        if (editor.isActive("listItem")) {
          return editor.commands.sinkListItem("listItem");
        }
        const { selection } = editor.state;
        const { $from, $to, empty } = selection;
        // Word: Tab at the very start of a paragraph/heading indents the block.
        if (empty && $from.parentOffset === 0) {
          for (let d = $from.depth; d > 0; d--) {
            const name = $from.node(d).type.name;
            if (name === "paragraph" || name === "heading") {
              return blockIndent(0.5);
            }
          }
        }
        // Word: a selection spanning multiple blocks indents them all.
        if (!empty && !$from.sameParent($to)) {
          return blockIndent(0.5);
        }
        // Otherwise insert a real tab character. CSS `tab-size` snaps it to the
        // next tab stop, matching Microsoft Word's mid-line Tab behavior.
        return editor.commands.insertContent("\t");
      },

      "Shift-Tab": () => {
        const editor = this.editor;
        if (editor.isActive("listItem")) {
          return editor.commands.liftListItem("listItem");
        }
        const { selection } = editor.state;
        const { $from, empty } = selection;
        // Remove a tab character immediately before the cursor (Word-ish outdent).
        if (empty && $from.parentOffset > 0) {
          const before = $from.parent.textBetween(
            $from.parentOffset - 1,
            $from.parentOffset
          );
          if (before === "\t") {
            return editor.commands.command(({ tr, dispatch }) => {
              if (dispatch) tr.delete($from.pos - 1, $from.pos);
              return true;
            });
          }
        }
        return blockIndent(-0.5);
      },
    };
  },
});
