import { describe, it, expect } from "vitest";
import { toThaiDigits, formatThaiDate } from "./thaiFormat";

describe("toThaiDigits", () => {
  it("converts arabic digits to thai numerals", () => {
    expect(toThaiDigits("2569")).toBe("๒๕๖๙");
    expect(toThaiDigits(123)).toBe("๑๒๓");
  });
  it("leaves non-digits untouched", () => {
    expect(toThaiDigits("ปี 2569 ฉบับ 4")).toBe("ปี ๒๕๖๙ ฉบับ ๔");
  });
});

describe("formatThaiDate", () => {
  // 2026-06-07 (CE) -> BE 2569. Local components for tz-independent reads.
  const d = new Date(2026, 5, 7);

  it("formats a full Buddhist-era date with thai numerals by default", () => {
    expect(formatThaiDate(d)).toBe("๗ มิถุนายน ๒๕๖๙");
  });

  it("supports arabic digits", () => {
    expect(formatThaiDate(d, { digits: "arabic" })).toBe("7 มิถุนายน 2569");
  });

  it("supports CE era", () => {
    expect(formatThaiDate(d, { digits: "arabic", era: "ce" })).toBe(
      "7 มิถุนายน 2026"
    );
  });

  it("supports short month names", () => {
    expect(formatThaiDate(d, { digits: "arabic", month: "short" })).toBe(
      "7 มิ.ย. 2569"
    );
  });

  it("supports numeric dd/mm/yyyy format", () => {
    expect(formatThaiDate(d, { digits: "arabic", month: "numeric" })).toBe(
      "07/06/2569"
    );
  });
});
