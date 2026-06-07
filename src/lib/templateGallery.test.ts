import { describe, it, expect } from "vitest";
import { GALLERY_TEMPLATES } from "./templateGallery";
import { stripPaginationWrappers } from "./export/stripPaginationWrappers";

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
});
