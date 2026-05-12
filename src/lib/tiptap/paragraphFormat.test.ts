import { describe, it, expect } from "vitest";

import { parseCssLengthToCm, parseLineHeight } from "./paragraphFormat";

describe("parseCssLengthToCm", () => {
  it("returns 0 for empty string", () => {
    expect(parseCssLengthToCm("")).toBe(0);
  });

  it("returns 0 for invalid input", () => {
    expect(parseCssLengthToCm("abc")).toBe(0);
  });

  it("parses centimetres", () => {
    expect(parseCssLengthToCm("2cm")).toBe(2);
    expect(parseCssLengthToCm("0.5 cm")).toBe(0.5);
  });

  it("parses millimetres", () => {
    expect(parseCssLengthToCm("10mm")).toBe(1);
    expect(parseCssLengthToCm("5 mm")).toBe(0.5);
  });

  it("parses inches", () => {
    expect(parseCssLengthToCm("1in")).toBeCloseTo(2.54);
    expect(parseCssLengthToCm("0.5 in")).toBeCloseTo(1.27);
  });

  it("parses points", () => {
    expect(parseCssLengthToCm("36pt")).toBeCloseTo(1.27, 1);
    expect(parseCssLengthToCm("72 pt")).toBeCloseTo(2.54, 1);
  });

  it("parses picas", () => {
    expect(parseCssLengthToCm("6pc")).toBeCloseTo(2.54, 1);
  });

  it("parses pixels using PX_PER_CM", () => {
    // 794 / 21 ≈ 37.8095 px per cm
    expect(parseCssLengthToCm("37.81px")).toBeCloseTo(1, 1);
    expect(parseCssLengthToCm("75.62 px")).toBeCloseTo(2, 1);
  });

  it("treats unitless numbers as cm", () => {
    expect(parseCssLengthToCm("3")).toBe(3);
    expect(parseCssLengthToCm("0")).toBe(0);
  });

  it("rejects negative values", () => {
    expect(parseCssLengthToCm("-2cm")).toBe(0);
    expect(parseCssLengthToCm("-36pt")).toBe(0);
    expect(parseCssLengthToCm("-10px")).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(parseCssLengthToCm("2CM")).toBe(2);
    expect(parseCssLengthToCm("36PT")).toBeCloseTo(1.27, 1);
  });
});

describe("parseLineHeight", () => {
  it("returns null for empty string", () => {
    expect(parseLineHeight("")).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseLineHeight("abc")).toBeNull();
  });

  it("parses single line height", () => {
    expect(parseLineHeight("1.15")).toEqual({
      lineHeightMode: "single",
      lineHeight: 1.15,
    });
  });

  it("parses oneHalf line height", () => {
    expect(parseLineHeight("1.5")).toEqual({
      lineHeightMode: "oneHalf",
      lineHeight: 1.5,
    });
  });

  it("parses double line height", () => {
    expect(parseLineHeight("2")).toEqual({
      lineHeightMode: "double",
      lineHeight: 2,
    });
  });

  it("parses pt values", () => {
    expect(parseLineHeight("12pt")).toEqual({
      lineHeightMode: "atLeast",
      lineHeight: 12,
    });
  });

  it("parses percentage values", () => {
    expect(parseLineHeight("150%")).toEqual({
      lineHeightMode: "multiple",
      lineHeight: 1.5,
    });
    expect(parseLineHeight("100%")).toEqual({
      lineHeightMode: "multiple",
      lineHeight: 1,
    });
  });

  it("parses bare multiplier values", () => {
    expect(parseLineHeight("1.2")).toEqual({
      lineHeightMode: "multiple",
      lineHeight: 1.2,
    });
  });

  it("parses large bare numbers as percentages divided by 100", () => {
    expect(parseLineHeight("150")).toEqual({
      lineHeightMode: "multiple",
      lineHeight: 1.5,
    });
    expect(parseLineHeight("200")).toEqual({
      lineHeightMode: "multiple",
      lineHeight: 2,
    });
  });

  it("rejects zero values", () => {
    expect(parseLineHeight("0")).toBeNull();
    expect(parseLineHeight("0pt")).toBeNull();
    expect(parseLineHeight("0%")).toBeNull();
  });

  it("rejects negative values", () => {
    expect(parseLineHeight("-1.5")).toBeNull();
    expect(parseLineHeight("-12pt")).toBeNull();
    expect(parseLineHeight("-50%")).toBeNull();
  });

  it("rejects absurdly large values", () => {
    expect(parseLineHeight("1001pt")).toBeNull();
    expect(parseLineHeight("1001%")).toBeNull();
    expect(parseLineHeight("1001")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(parseLineHeight("12PT")).toEqual({
      lineHeightMode: "atLeast",
      lineHeight: 12,
    });
    expect(parseLineHeight("150%")).toEqual({
      lineHeightMode: "multiple",
      lineHeight: 1.5,
    });
  });
});
