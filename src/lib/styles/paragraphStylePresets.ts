import type { ParagraphFormatValues } from "@/lib/tiptap/paragraphFormat";

/**
 * A reusable Word-style paragraph style preset. Applying a preset sets the
 * block type (paragraph vs. heading level) plus a bundle of paragraph-format
 * values (spacing / indent / line height). Sizing of titles/headings is left
 * to the caller; this module only carries the structural + format intent.
 */
export interface ParagraphStylePreset {
  /** Stable identifier, e.g. "normal", "title", "heading1". */
  id: string;
  /** Thai + EN label, e.g. "ปกติ (Normal)". */
  label: string;
  /** Heading level to apply, or null for a plain paragraph. */
  headingLevel: 1 | 2 | 3 | null;
  /** Whether the preset implies bold text (caller applies the mark). */
  bold?: boolean;
  /** Paragraph-format values (spacing in pt, margins/indent in cm). */
  format: ParagraphFormatValues;
}

export const PARAGRAPH_STYLE_PRESETS: ParagraphStylePreset[] = [
  {
    id: "normal",
    label: "ปกติ (Normal)",
    headingLevel: null,
    format: { spaceBefore: 0, spaceAfter: 6, lineHeightMode: "single" },
  },
  {
    id: "title",
    label: "ชื่อเรื่อง (Title)",
    headingLevel: null,
    bold: true,
    format: { spaceBefore: 0, spaceAfter: 12, lineHeightMode: "single" },
  },
  {
    id: "heading1",
    label: "หัวข้อ 1 (Heading 1)",
    headingLevel: 1,
    format: { spaceBefore: 12, spaceAfter: 6 },
  },
  {
    id: "heading2",
    label: "หัวข้อ 2 (Heading 2)",
    headingLevel: 2,
    format: { spaceBefore: 10, spaceAfter: 4 },
  },
  {
    id: "heading3",
    label: "หัวข้อ 3 (Heading 3)",
    headingLevel: 3,
    format: { spaceBefore: 8, spaceAfter: 4 },
  },
  {
    id: "quote",
    label: "ยกข้อความ (Quote)",
    headingLevel: null,
    format: { marginLeft: 1, marginRight: 1, spaceBefore: 6, spaceAfter: 6 },
  },
];

/** Look up a preset by its `id`. Returns `undefined` when not found. */
export function getPresetById(id: string): ParagraphStylePreset | undefined {
  return PARAGRAPH_STYLE_PRESETS.find((preset) => preset.id === id);
}
