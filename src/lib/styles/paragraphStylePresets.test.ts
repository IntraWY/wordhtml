import { describe, it, expect } from "vitest";
import {
  PARAGRAPH_STYLE_PRESETS,
  getPresetById,
  type ParagraphStylePreset,
} from "./paragraphStylePresets";

const THAI_REGEX = /[฀-๿]/;

describe("PARAGRAPH_STYLE_PRESETS", () => {
  it("contains all six expected presets with unique ids", () => {
    expect(PARAGRAPH_STYLE_PRESETS).toHaveLength(6);
    const ids = PARAGRAPH_STYLE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "normal",
      "title",
      "heading1",
      "heading2",
      "heading3",
      "quote",
    ]);
  });

  it("every preset has a label containing Thai text", () => {
    for (const preset of PARAGRAPH_STYLE_PRESETS) {
      expect(THAI_REGEX.test(preset.label)).toBe(true);
    }
  });

  it("heading presets have a numeric headingLevel", () => {
    const headings = PARAGRAPH_STYLE_PRESETS.filter((p) =>
      p.id.startsWith("heading")
    );
    expect(headings).toHaveLength(3);
    for (const preset of headings) {
      expect(typeof preset.headingLevel).toBe("number");
      expect([1, 2, 3]).toContain(preset.headingLevel);
    }
  });

  it("normal, title, and quote presets have null headingLevel", () => {
    for (const id of ["normal", "title", "quote"]) {
      const preset = getPresetById(id) as ParagraphStylePreset;
      expect(preset.headingLevel).toBeNull();
    }
  });
});

describe("getPresetById", () => {
  it("returns the matching preset on a hit", () => {
    const preset = getPresetById("heading2");
    expect(preset).toBeDefined();
    expect(preset?.id).toBe("heading2");
    expect(preset?.headingLevel).toBe(2);
  });

  it("returns undefined on a miss", () => {
    expect(getPresetById("does-not-exist")).toBeUndefined();
  });
});
