import { describe, it, expect } from "vitest";
import { formatValue } from "./formatters";

describe("formatValue - text", () => {
  it("returns raw value when type is undefined", () => {
    expect(formatValue("hello")).toBe("hello");
  });

  it("returns raw value when type is text", () => {
    expect(formatValue("hello", "text")).toBe("hello");
  });
});

describe("formatValue - number", () => {
  it("formats as integer", () => {
    expect(formatValue("1234.56", "number", "integer")).toBe("1,235");
  });

  it("formats as decimal(2) by default", () => {
    expect(formatValue("1234.5", "number")).toBe("1,234.50");
    expect(formatValue("1234.5", "number", "decimal(2)")).toBe("1,234.50");
  });

  it("falls back to raw value for non-numeric", () => {
    expect(formatValue("abc", "number")).toBe("abc");
  });
});

describe("formatValue - currency", () => {
  it("formats THB by default", () => {
    expect(formatValue("1234.5", "currency")).toBe("1,234.50 บาท");
    expect(formatValue("1234.5", "currency", "THB")).toBe("1,234.50 บาท");
  });

  it("formats USD", () => {
    expect(formatValue("1234.5", "currency", "USD")).toBe("$1,234.50");
  });

  it("falls back to raw value for non-numeric", () => {
    expect(formatValue("abc", "currency")).toBe("abc");
  });
});

describe("formatValue - date", () => {
  it("formats long date (Thai Buddhist calendar)", () => {
    expect(formatValue("2026-05-20", "date", "long")).toBe("20 พฤษภาคม 2569");
  });

  it("formats short date", () => {
    const result = formatValue("2026-05-20", "date", "short");
    expect(result).toContain("20");
    expect(result).toContain("05");
    expect(result).toContain("2569");
  });

  it("formats iso date", () => {
    expect(formatValue("2026-05-20", "date", "iso")).toBe("2026-05-20");
  });

  it("parses Thai locale date", () => {
    expect(formatValue("20/05/2569", "date", "iso")).toBe("2026-05-20");
  });

  it("falls back to raw value for invalid date", () => {
    expect(formatValue("not-a-date", "date")).toBe("not-a-date");
  });
});

describe("formatValue - percent", () => {
  it("formats 0-100 by multiplying decimal by 100", () => {
    expect(formatValue("0.15", "percent", "0-100")).toBe("15%");
    expect(formatValue("1", "percent", "0-100")).toBe("100%");
  });

  it("formats 0.0-1.0 as-is", () => {
    expect(formatValue("0.15", "percent", "0.0-1.0")).toBe("0.2%");
  });

  it("falls back to raw value for non-numeric", () => {
    expect(formatValue("abc", "percent")).toBe("abc");
  });
});
