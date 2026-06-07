import { describe, it, expect } from "vitest";
import { formatThaiPageNumber } from "./thaiPageNumber";

describe("formatThaiPageNumber", () => {
  it("uses arabic digits with label by default", () => {
    expect(formatThaiPageNumber(1, 5)).toBe("หน้า 1/5");
  });

  it("converts to thai digits when requested", () => {
    expect(formatThaiPageNumber(1, 5, { digits: "thai" })).toBe("หน้า ๑/๕");
  });

  it("omits the label when label is false", () => {
    expect(formatThaiPageNumber(2, 3, { label: false })).toBe("2/3");
  });

  it("combines thai digits and no label", () => {
    expect(formatThaiPageNumber(10, 12, { digits: "thai", label: false })).toBe(
      "๑๐/๑๒"
    );
  });

  it("explicit arabic + label matches default", () => {
    expect(
      formatThaiPageNumber(3, 7, { digits: "arabic", label: true })
    ).toBe("หน้า 3/7");
  });

  it("rounds non-integer inputs", () => {
    expect(formatThaiPageNumber(2.4, 5.6)).toBe("หน้า 2/6");
  });

  it("treats negative values as 0", () => {
    expect(formatThaiPageNumber(-1, -5)).toBe("หน้า 0/0");
  });

  it("treats NaN as 0", () => {
    expect(formatThaiPageNumber(NaN, 5)).toBe("หน้า 0/5");
  });

  it("treats Infinity as 0", () => {
    expect(formatThaiPageNumber(1, Infinity)).toBe("หน้า 1/0");
    expect(formatThaiPageNumber(-Infinity, 3)).toBe("หน้า 0/3");
  });

  it("treats NaN as 0 even with thai digits", () => {
    expect(formatThaiPageNumber(NaN, NaN, { digits: "thai" })).toBe("หน้า ๐/๐");
  });
});
