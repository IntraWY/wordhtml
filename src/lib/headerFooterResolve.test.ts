import { describe, it, expect } from "vitest";
import {
  resolveHeaderFooter,
  resolveHeaderFooterForPage,
} from "./headerFooterResolve";
import type { HeaderFooterConfig } from "@/types";

describe("resolveHeaderFooter", () => {
  it("uses first page header when differentFirstPage and page 1", () => {
    const { header } = resolveHeaderFooter(
      1,
      "H",
      "F",
      true,
      false,
      "FIRST-H",
      "FIRST-F"
    );
    expect(header).toBe("FIRST-H");
  });

  it("uses even header on page 2 when differentOddEven", () => {
    const { header } = resolveHeaderFooter(
      2,
      "H",
      "F",
      false,
      true,
      undefined,
      undefined,
      "EVEN-H",
      "EVEN-F"
    );
    expect(header).toBe("EVEN-H");
  });
});

describe("resolveHeaderFooterForPage", () => {
  const baseConfig: HeaderFooterConfig = {
    enabled: true,
    headerHtml: "<p>เอกสาร</p>",
    footerHtml: "<p>หน้า {page} จาก {total}</p>",
    differentFirstPage: false,
    differentOddEven: false,
  };

  it("substitutes page tokens in the resolved footer", () => {
    const { footer } = resolveHeaderFooterForPage(3, 7, baseConfig);
    expect(footer).toBe("<p>หน้า 3 จาก 7</p>");
  });

  it("resolves the even variant before substituting tokens", () => {
    const { footer } = resolveHeaderFooterForPage(2, 4, {
      ...baseConfig,
      differentOddEven: true,
      evenFooterHtml: "<p>{page} (คู่)</p>",
    });
    expect(footer).toBe("<p>2 (คู่)</p>");
  });

  it("keeps rich formatting markup intact", () => {
    const { header } = resolveHeaderFooterForPage(1, 1, {
      ...baseConfig,
      headerHtml:
        '<p style="text-align:center"><strong>บริษัท</strong> <span style="font-size:12px">ทดสอบ</span></p>',
    });
    expect(header).toContain('text-align:center');
    expect(header).toContain("<strong>บริษัท</strong>");
    expect(header).toContain('font-size:12px');
  });
});
