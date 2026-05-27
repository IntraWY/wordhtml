import { describe, expect, it } from "vitest";
import {
  formatImageWidthLabel,
  imageWidthMatchesPreset,
  resolveImagePresetWidth,
} from "./imageScale";

describe("imageScale", () => {
  it("converts percentage preset to px against container", () => {
    expect(resolveImagePresetWidth("25%", 800)).toBe("200");
    expect(resolveImagePresetWidth("50%", 800)).toBe("400");
  });

  it("matches px width to preset", () => {
    expect(imageWidthMatchesPreset("200", "25%", 800)).toBe(true);
    expect(imageWidthMatchesPreset("400", "25%", 800)).toBe(false);
    expect(imageWidthMatchesPreset("25%", "25%", 800)).toBe(true);
  });

  it("formats px as preset label when close", () => {
    expect(formatImageWidthLabel("200", 800)).toBe("25%");
    expect(formatImageWidthLabel("401", 800)).toBe("50%");
  });
});
