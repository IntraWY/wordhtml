import { describe, it, expect } from "vitest";
import {
  hasWatermark,
  watermarkRenderAttrs,
  watermarkPrintCss,
} from "./watermark";

describe("hasWatermark", () => {
  it("is false for undefined / blank text", () => {
    expect(hasWatermark(undefined)).toBe(false);
    expect(hasWatermark(null)).toBe(false);
    expect(hasWatermark({ text: "" })).toBe(false);
    expect(hasWatermark({ text: "   " })).toBe(false);
  });
  it("is true for non-blank text", () => {
    expect(hasWatermark({ text: "ร่าง" })).toBe(true);
  });
});

describe("watermarkRenderAttrs", () => {
  it("returns {} when no watermark", () => {
    expect(watermarkRenderAttrs(undefined)).toEqual({});
    expect(watermarkRenderAttrs({ text: " " })).toEqual({});
  });

  it("returns data + style vars with defaults", () => {
    const r = watermarkRenderAttrs({ text: "ร่าง" });
    expect(r.dataWatermark).toBe("ร่าง");
    expect(r.styleVars).toContain("--wm-text:'ร่าง'");
    expect(r.styleVars).toContain("--wm-opacity:0.12");
    expect(r.styleVars).toContain("--wm-size:90px");
    expect(r.styleVars).toContain("--wm-color:#1f2937");
    expect(r.styleVars).toContain("--wm-angle:-45deg");
  });

  it("honors overrides and clamps opacity", () => {
    const r = watermarkRenderAttrs({
      text: "สำเนา",
      opacity: 5,
      fontSize: 60,
      color: "#c00",
      angle: -30,
    });
    expect(r.styleVars).toContain("--wm-opacity:1"); // clamped
    expect(r.styleVars).toContain("--wm-size:60px");
    expect(r.styleVars).toContain("--wm-color:#c00");
    expect(r.styleVars).toContain("--wm-angle:-30deg");
  });

  it("trims text", () => {
    expect(watermarkRenderAttrs({ text: "  ลับ  " }).dataWatermark).toBe("ลับ");
  });

  it("single-quote escapes the --wm-text value", () => {
    const r = watermarkRenderAttrs({ text: "it's" });
    expect(r.styleVars).toContain("--wm-text:'it\\'s'");
  });
});

describe("watermarkPrintCss", () => {
  it("returns empty string when no watermark", () => {
    expect(watermarkPrintCss(undefined)).toBe("");
    expect(watermarkPrintCss({ text: "" })).toBe("");
  });

  it("includes the text, fixed positioning, and rotation", () => {
    const css = watermarkPrintCss({ text: "ร่าง" });
    expect(css).toContain('content:"ร่าง"');
    expect(css).toContain("position:fixed");
    expect(css).toContain("transform:rotate(-45deg)");
  });

  it("escapes embedded quotes and backslashes", () => {
    const css = watermarkPrintCss({ text: 'a"b\\c' });
    expect(css).toContain('content:"a\\"b\\\\c"');
  });
});
