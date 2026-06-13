import { describe, it, expect } from "vitest";
import {
  replaceMergeFields,
  extractMergeFieldNames,
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
});

describe("filter type validation (GAP 01)", () => {
  const nameVars: TemplateVariable[] = [
    { name: "ชื่อ", value: "สมชาย ใจดี", isList: false },
  ];

  it("|baht with a non-numeric value returns the original value (never empty)", () => {
    const out = replaceMergeFields("{{ชื่อ|baht}}", nameVars, {}, { mode: "export" });
    expect(out).toContain("สมชาย ใจดี");
    expect(out).not.toBe("");
  });

  it("|currency with a non-numeric value returns the original value", () => {
    const out = replaceMergeFields("{{ชื่อ|currency}}", nameVars, {}, { mode: "export" });
    expect(out).toContain("สมชาย ใจดี");
  });

  it("validateMergeFilters reports numeric-filter mismatches", () => {
    const mismatches = validateMergeFilters("<p>{{ชื่อ|baht}}</p>", nameVars);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].field).toBe("ชื่อ");
    expect(mismatches[0].filter).toBe("baht");
    expect(mismatches[0].value).toBe("สมชาย ใจดี");
    expect(mismatches[0].reason.length).toBeGreaterThan(0);
  });

  it("validateMergeFilters returns [] when the value is numeric", () => {
    expect(validateMergeFilters("<p>{{ราคา|baht}} {{ราคา|comma}}</p>", vars)).toEqual([]);
  });

  it("validateMergeFilters accepts Thai-numeral values as numeric", () => {
    const thaiVars: TemplateVariable[] = [
      { name: "ยอด", value: "๑,๒๓๔.๕๐", isList: false },
    ];
    expect(validateMergeFilters("{{ยอด|currency}}", thaiVars)).toEqual([]);
  });

  it("validateMergeFilters prefers dataRow values over variable defaults", () => {
    const mismatches = validateMergeFilters("{{ราคา|baht}}", vars, { ราคา: "ไม่ระบุ" });
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].value).toBe("ไม่ระบุ");
  });

  it("validateMergeFilters skips empty/missing values (handled by missing-field checks)", () => {
    const emptyVars: TemplateVariable[] = [{ name: "ราคา", value: "", isList: false }];
    expect(validateMergeFilters("{{ราคา|baht}}", emptyVars)).toEqual([]);
    expect(validateMergeFilters("{{ไม่มี|baht}}", [])).toEqual([]);
  });

  it("validateMergeFilters flags |date with an unparseable date", () => {
    const dateVars: TemplateVariable[] = [
      { name: "วันที่", value: "ไม่ใช่วันที่", isList: false },
    ];
    const mismatches = validateMergeFilters("{{วันที่|date}}", dateVars);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].filter).toBe("date");
  });

  it("validateMergeFilters ignores string filters (upper/lower/thai)", () => {
    expect(validateMergeFilters("{{ชื่อ|upper}} {{ชื่อ|lower}} {{ชื่อ|thai}}", nameVars)).toEqual([]);
  });
});

describe("new merge-field filters (GAP 03)", () => {
  const numVars: TemplateVariable[] = [
    { name: "ยอด", value: "1234.5", isList: false },
    { name: "จำนวน", value: "1234567", isList: false },
    { name: "อัตรา", value: "7", isList: false },
    { name: "อัตราละเอียด", value: "7.456", isList: false },
    { name: "ชื่อ", value: "Somchai Jaidee", isList: false },
  ];

  it("|currency formats a number as 1,234.50", () => {
    const out = replaceMergeFields("{{ยอด|currency}}", numVars, {}, { mode: "export" });
    expect(out).toContain("1,234.50");
  });

  it("|currency accepts Thai-numeral input", () => {
    const thaiVars: TemplateVariable[] = [
      { name: "ยอด", value: "๑๒๓๔.๕", isList: false },
    ];
    const out = replaceMergeFields("{{ยอด|currency}}", thaiVars, {}, { mode: "export" });
    expect(out).toContain("1,234.50");
  });

  it("|percent treats the value as an already-percent number, up to 2 decimals", () => {
    expect(
      replaceMergeFields("{{อัตรา|percent}}", numVars, {}, { mode: "export" })
    ).toContain("7%");
    expect(
      replaceMergeFields("{{อัตราละเอียด|percent}}", numVars, {}, { mode: "export" })
    ).toContain("7.46%");
  });

  it("|comma groups integers and keeps decimals", () => {
    expect(
      replaceMergeFields("{{จำนวน|comma}}", numVars, {}, { mode: "export" })
    ).toContain("1,234,567");
    expect(
      replaceMergeFields("{{ยอด|comma}}", numVars, {}, { mode: "export" })
    ).toContain("1,234.5");
  });

  it("|upper / |lower change string case", () => {
    expect(
      replaceMergeFields("{{ชื่อ|upper}}", numVars, {}, { mode: "export" })
    ).toContain("SOMCHAI JAIDEE");
    expect(
      replaceMergeFields("{{ชื่อ|lower}}", numVars, {}, { mode: "export" })
    ).toContain("somchai jaidee");
  });

  it("|percent and |comma with non-numeric values return the original value", () => {
    expect(
      replaceMergeFields("{{ชื่อ|percent}}", numVars, {}, { mode: "export" })
    ).toContain("Somchai Jaidee");
    expect(
      replaceMergeFields("{{ชื่อ|comma}}", numVars, {}, { mode: "export" })
    ).toContain("Somchai Jaidee");
  });

  it("extractMergeFieldNames recognises the new filters", () => {
    const names = extractMergeFieldNames(
      "{{a|currency}} {{b|percent}} {{c|comma}} {{d|upper}} {{e|lower}}"
    );
    expect(names).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("edit mode leaves new filtered fields literal", () => {
    const out = replaceMergeFields("{{ยอด|currency}}", numVars, {}, { mode: "edit" });
    expect(out).toBe("{{ยอด|currency}}");
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
