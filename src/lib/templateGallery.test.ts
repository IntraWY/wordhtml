import { describe, it, expect } from "vitest";
import { GALLERY_TEMPLATES } from "./templateGallery";
import { stripPaginationWrappers } from "./export/stripPaginationWrappers";
import { extractMergeFieldNames } from "./placeholders/mergeFields";

describe("GALLERY_TEMPLATES", () => {
  it("has unique ids", () => {
    const ids = GALLERY_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every template is wrapped in a page-node/page-body", () => {
    for (const t of GALLERY_TEMPLATES) {
      expect(t.html).toContain("page-node");
      expect(t.html).toContain("page-body");
    }
  });

  it("includes the core Thai official document types", () => {
    const ids = GALLERY_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "gov-letter-external",
        "memo",
        "announcement",
        "procurement-request",
      ])
    );
  });

  it("procurement template showcases the |baht filter and {date_th} token", () => {
    const proc = GALLERY_TEMPLATES.find((t) => t.id === "procurement-request");
    expect(proc).toBeTruthy();
    expect(proc!.templateMode).toBe(true);
    expect(proc!.html).toContain("|baht}}");
    expect(proc!.html).toContain("{date_th}");
  });

  it("template content survives wrapper stripping (export-safe)", () => {
    for (const t of GALLERY_TEMPLATES) {
      const stripped = stripPaginationWrappers(t.html);
      expect(stripped).not.toContain("page-node");
      expect(stripped).not.toContain("page-body");
    }
  });

  describe("real-form templates (PEA memo + Excel forms)", () => {
    it("includes the three real-form templates", () => {
      const ids = GALLERY_TEMPLATES.map((t) => t.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          "pea-temp-switch",
          "budget-certification",
          "material-return",
        ])
      );
    });

    it("pea-temp-switch has two pages and a repeating coordinates row", () => {
      const t = GALLERY_TEMPLATES.find((x) => x.id === "pea-temp-switch")!;
      expect(t.templateMode).toBe(true);
      expect(t.html).toContain('data-page-number="1"');
      expect(t.html).toContain('data-page-number="2"');
      expect(t.html.match(/data-repeat="true"/g)!.length).toBeGreaterThanOrEqual(2);
      const fields = extractMergeFieldNames(t.html);
      expect(fields).toEqual(
        expect.arrayContaining(["สถานี", "ฟีดเดอร์", "ละติจูด", "ลองจิจูด", "ผู้รับรอง"])
      );
    });

    it("material-return uses the user's existing field names and a repeating item row", () => {
      const t = GALLERY_TEMPLATES.find((x) => x.id === "material-return")!;
      expect(t.html).toContain('data-repeat="true"');
      const fields = extractMergeFieldNames(t.html);
      expect(fields).toEqual(
        expect.arrayContaining(["ชื่องานคำอธิบาย", "เลขWBS", "รหัสพัสดุ", "มูลค่า"])
      );
    });

    it("form templates use borderless signature zones that survive cleaning", () => {
      for (const id of ["pea-temp-switch", "budget-certification", "material-return"]) {
        const t = GALLERY_TEMPLATES.find((x) => x.id === id)!;
        expect(t.html).toContain('data-borders="none"');
      }
    });

    it("budget-certification covers the four PEA budget lines", () => {
      const t = GALLERY_TEMPLATES.find((x) => x.id === "budget-certification")!;
      expect(t.html).toContain("53010060");
      expect(t.html).toContain("53052040");
      expect(t.html).toContain("53069020");
      expect(t.html).toContain("ค่าเบ็ดเตล็ด");
    });
  });
});
