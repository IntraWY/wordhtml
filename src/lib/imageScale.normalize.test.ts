import { describe, expect, it } from "vitest";
import { normalizeImagePercentWidths } from "./imageScale";
import type { PageSetup } from "@/types";

const TEST_PAGE_SETUP: PageSetup = {
  size: "A4",
  orientation: "portrait",
  marginMm: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
};

describe("normalizeImagePercentWidths", () => {
  it("converts percentage img width to px using page content width", () => {
    const html = '<img src="x" width="25%" style="width:25%" />';
    const out = normalizeImagePercentWidths(html, TEST_PAGE_SETUP);
    expect(out).not.toContain("25%");
    expect(out).toMatch(/width="\d+"/);
    expect(out).toMatch(/width:\s*\d+px/);
  });

  it("uses measured content width when provided", () => {
    const html = '<img src="x" width="50%" style="width:50%" />';
    const out = normalizeImagePercentWidths(html, TEST_PAGE_SETUP, 400);
    expect(out).toContain('width="200"');
    expect(out).toMatch(/width:\s*200px/);
  });
});
