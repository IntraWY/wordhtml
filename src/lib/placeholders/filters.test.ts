import { describe, it, expect } from "vitest";
import {
  replaceMergeFields,
  extractMergeFieldNames,
  applyMergeFilter,
  parseNumericValue,
  validateMergeFilters,
} from "./mergeFields";
import { replacePageTokens } from "./pageTokens";
import type { TemplateVariable } from "@/types";

const vars: TemplateVariable[] = [
  { name: "ราคา", value: "1250.50", isList: false },
  { name: "ปี", value: "2569", isList: false },
];

describe("merge-field filters", () => {
  it("applies |baht to render a Thai baht amount", () => {
    const out = replaceMergeFields("ราคา {{ราคา|baht}}", vars, {}, {
      mode: "export",
    });
    expect(out).toContain("หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์");
  });

  it("applies |thai to convert digits to Thai numerals", () => {
    const out = replaceMergeFields("ปี {{ปี|thai}}", vars, {}, {
      mode: "export",
    });
    expect(out).toContain("๒๕๖๙");
  });

  it("keeps plain {{name}} working unchanged", () => {
    const out = replaceMergeFields("{{ปี}}", vars, {}, { mode: "export" });
    expect(out).toContain("2569");
  });

  it("leaves filtered fields literal in edit mode", () => {
    const out = replaceMergeFields("{{ราคา|baht}}", vars, {}, { mode: "edit" });
    expect(out).toBe("{{ราคา|baht}}");
  });

  it("extractMergeFieldNames sees the variable name behind a filter", () => {
    const names = extractMergeFieldNames("{{ราคา|baht}} และ {{ปี}}");
    expect(names).toContain("ราคา");
    expect(names).toContain("ปี");
  });

  it("applies |comma to format numbers with thousand separators", () => {
    const moneyVars: TemplateVariable[] = [
      { name: "งบ", value: "1234567.5", isList: false },
      { name: "งบมีคอมมา", value: "1,234,567", isList: false },
      { name: "ข้อความ", value: "ไม่ใช่เลข", isList: false },
    ];
    expect(
      replaceMergeFields("{{งบ|comma}}", moneyVars, {}, { mode: "export" })
    ).toContain("1,234,567.5");
    // Tolerates pre-formatted input
    expect(
      replaceMergeFields("{{งบมีคอมมา|comma}}", moneyVars, {}, { mode: "export" })
    ).toContain("1,234,567");
    // Non-numeric passes through unchanged
    expect(
      replaceMergeFields("{{ข้อความ|comma}}", moneyVars, {}, { mode: "export" })
    ).toContain("ไม่ใช่เลข");
  });

  it("extractMergeFieldNames sees the name behind |comma", () => {
    expect(extractMergeFieldNames("{{งบค่าแรง|comma}}")).toContain("งบค่าแรง");
  });

  it("applies |currency to render a fixed 2-decimal amount with separators", () => {
    expect(applyMergeFilter("1234.5", "currency")).toBe("1,234.50");
    expect(applyMergeFilter("1234567", "currency")).toBe("1,234,567.00");
    const v: TemplateVariable[] = [{ name: "x", value: "1234.5", isList: false }];
    expect(replaceMergeFields("{{x|currency}}", v, {}, { mode: "export" })).toContain(
      "1,234.50"
    );
  });

  it("applies |percent to append a percent sign", () => {
    expect(applyMergeFilter("7", "percent")).toBe("7%");
    expect(applyMergeFilter("12.5", "percent")).toBe("12.5%");
  });

  it("applies |upper / |lower to change case", () => {
    expect(applyMergeFilter("hello", "upper")).toBe("HELLO");
    expect(applyMergeFilter("HELLO", "lower")).toBe("hello");
    const v: TemplateVariable[] = [{ name: "n", value: "hi", isList: false }];
    expect(replaceMergeFields("{{n|upper}}", v, {}, { mode: "export" })).toContain(
      "HI"
    );
  });

  it("numeric filters pass through non-numeric values unchanged", () => {
    expect(applyMergeFilter("abc", "currency")).toBe("abc");
    expect(applyMergeFilter("abc", "percent")).toBe("abc");
    expect(applyMergeFilter("", "comma")).toBe("");
  });

  it("parseNumericValue accepts Thai numerals and commas", () => {
    expect(parseNumericValue("๑,๒๓๔.๕")).toBe(1234.5);
    expect(parseNumericValue("1,000")).toBe(1000);
    expect(parseNumericValue("abc")).toBeNull();
    expect(parseNumericValue("")).toBeNull();
  });

  it("validateMergeFilters flags a non-numeric value for a numeric filter", () => {
    const v: TemplateVariable[] = [{ name: "amt", value: "ไม่ใช่เลข", isList: false }];
    const mismatches = validateMergeFilters("{{amt|currency}}", v, {});
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].field).toBe("amt");
    expect(mismatches[0].filter).toBe("currency");
  });

  it("validateMergeFilters does not flag a valid numeric value", () => {
    const v: TemplateVariable[] = [{ name: "amt", value: "1234", isList: false }];
    expect(validateMergeFilters("{{amt|currency}}", v, {})).toHaveLength(0);
  });
});

describe("Thai date page tokens", () => {
  const ctx = { pageNumber: 1, totalPages: 1, now: new Date(2026, 5, 7) };

  it("{date_th} renders full Buddhist-era date in Thai numerals", () => {
    expect(replacePageTokens("{date_th}", ctx)).toBe("๗ มิถุนายน ๒๕๖๙");
  });

  it("{date_th_short} renders a short Thai date", () => {
    expect(replacePageTokens("{date_th_short}", ctx)).toBe("๗ มิ.ย. ๒๕๖๙");
  });

  it("{page_th}/{total_th} render page numbers in Thai numerals", () => {
    const c = { pageNumber: 3, totalPages: 12, now: new Date(2026, 5, 7) };
    expect(replacePageTokens("หน้า {page_th}/{total_th}", c)).toBe("หน้า ๓/๑๒");
  });

  it("{page}/{total} stay Arabic", () => {
    const c = { pageNumber: 3, totalPages: 12, now: new Date(2026, 5, 7) };
    expect(replacePageTokens("{page}/{total}", c)).toBe("3/12");
  });
});
