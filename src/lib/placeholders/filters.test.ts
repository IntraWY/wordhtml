import { describe, it, expect } from "vitest";
import { replaceMergeFields, extractMergeFieldNames } from "./mergeFields";
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
