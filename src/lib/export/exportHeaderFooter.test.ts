import { describe, it, expect } from "vitest";
import {
  buildHeaderFooterExportBlocks,
  countPageBreaksInHtml,
} from "./exportHeaderFooter";
import type { HeaderFooterConfig, PageSetup } from "@/types";

function makePageSetup(hf?: Partial<HeaderFooterConfig>): PageSetup {
  return {
    size: "A4",
    orientation: "portrait",
    marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
    headerFooter: hf
      ? {
          enabled: true,
          headerHtml: "",
          footerHtml: "",
          differentFirstPage: false,
          differentOddEven: false,
          ...hf,
        }
      : undefined,
  };
}

function chromeDivs(bodyPrefix: string): HTMLElement[] {
  const doc = new DOMParser().parseFromString(bodyPrefix, "text/html");
  return [...doc.querySelectorAll<HTMLElement>(".export-page-chrome")];
}

function headerOf(div: HTMLElement): string {
  return div.querySelector(".export-hf-header")?.innerHTML ?? "";
}

function footerOf(div: HTMLElement): string {
  return div.querySelector(".export-hf-footer")?.innerHTML ?? "";
}

describe("buildHeaderFooterExportBlocks", () => {
  it("returns empty blocks when pageSetup is undefined", () => {
    expect(buildHeaderFooterExportBlocks(undefined, 3)).toEqual({
      css: "",
      bodyPrefix: "",
      bodySuffix: "",
    });
  });

  it("returns empty blocks when header/footer is not configured", () => {
    expect(buildHeaderFooterExportBlocks(makePageSetup(undefined), 3)).toEqual({
      css: "",
      bodyPrefix: "",
      bodySuffix: "",
    });
  });

  it("returns empty blocks when header/footer is configured but disabled", () => {
    const setup = makePageSetup({ enabled: false, headerHtml: "<p>หัว</p>" });
    expect(buildHeaderFooterExportBlocks(setup, 3)).toEqual({
      css: "",
      bodyPrefix: "",
      bodySuffix: "",
    });
  });

  it("emits one chrome block per page with sequential data-page attributes", () => {
    const setup = makePageSetup({ headerHtml: "หัวกระดาษ", footerHtml: "ท้ายกระดาษ" });
    const { bodyPrefix, bodySuffix } = buildHeaderFooterExportBlocks(setup, 3);
    const divs = chromeDivs(bodyPrefix);
    expect(divs).toHaveLength(3);
    expect(divs.map((d) => d.getAttribute("data-page"))).toEqual(["1", "2", "3"]);
    divs.forEach((d) => {
      expect(headerOf(d)).toBe("หัวกระดาษ");
      expect(footerOf(d)).toBe("ท้ายกระดาษ");
      expect(d.style.pageBreakAfter).toBe("always");
    });
    expect(bodySuffix).toBe("");
  });

  it("resolves {page} and {total} tokens per page", () => {
    const setup = makePageSetup({ footerHtml: "หน้า {page} / {total}" });
    const { bodyPrefix } = buildHeaderFooterExportBlocks(setup, 2);
    const divs = chromeDivs(bodyPrefix);
    expect(footerOf(divs[0])).toBe("หน้า 1 / 2");
    expect(footerOf(divs[1])).toBe("หน้า 2 / 2");
  });

  it("resolves Thai-numeral tokens {page_th} and {total_th}", () => {
    const setup = makePageSetup({ headerHtml: "หน้า {page_th}/{total_th}" });
    const { bodyPrefix } = buildHeaderFooterExportBlocks(setup, 12);
    const divs = chromeDivs(bodyPrefix);
    expect(headerOf(divs[0])).toBe("หน้า ๑/๑๒");
    expect(headerOf(divs[11])).toBe("หน้า ๑๒/๑๒");
  });

  it("clamps totalPages to a minimum of one page block", () => {
    const setup = makePageSetup({ headerHtml: "ห" });
    expect(chromeDivs(buildHeaderFooterExportBlocks(setup, 0).bodyPrefix)).toHaveLength(1);
    expect(chromeDivs(buildHeaderFooterExportBlocks(setup, -5).bodyPrefix)).toHaveLength(1);
  });

  it("keeps chrome blocks with empty header/footer divs when both strings are empty", () => {
    const setup = makePageSetup({ headerHtml: "", footerHtml: "" });
    const { bodyPrefix, css } = buildHeaderFooterExportBlocks(setup, 2);
    const divs = chromeDivs(bodyPrefix);
    expect(divs).toHaveLength(2);
    expect(headerOf(divs[0])).toBe("");
    expect(footerOf(divs[0])).toBe("");
    expect(css).toContain(".export-page-chrome");
  });

  it("uses the first-page header/footer on page 1 only when differentFirstPage is set", () => {
    const setup = makePageSetup({
      headerHtml: "หัวปกติ",
      footerHtml: "ท้ายปกติ",
      differentFirstPage: true,
      firstPageHeaderHtml: "หัวหน้าแรก",
      firstPageFooterHtml: "ท้ายหน้าแรก",
    });
    const divs = chromeDivs(buildHeaderFooterExportBlocks(setup, 3).bodyPrefix);
    expect(headerOf(divs[0])).toBe("หัวหน้าแรก");
    expect(footerOf(divs[0])).toBe("ท้ายหน้าแรก");
    expect(headerOf(divs[1])).toBe("หัวปกติ");
    expect(headerOf(divs[2])).toBe("หัวปกติ");
  });

  it("uses the even header on even pages when differentOddEven is set", () => {
    const setup = makePageSetup({
      headerHtml: "หัวคี่",
      differentOddEven: true,
      evenHeaderHtml: "หัวคู่ หน้า {page}",
    });
    const divs = chromeDivs(buildHeaderFooterExportBlocks(setup, 4).bodyPrefix);
    expect(headerOf(divs[0])).toBe("หัวคี่");
    expect(headerOf(divs[1])).toBe("หัวคู่ หน้า 2");
    expect(headerOf(divs[2])).toBe("หัวคี่");
    expect(headerOf(divs[3])).toBe("หัวคู่ หน้า 4");
  });

  it("sanitizes header/footer HTML: scripts and event handlers are stripped", () => {
    const setup = makePageSetup({
      headerHtml: '<script>alert(1)</script><b onclick="evil()">หัว</b>',
    });
    const { bodyPrefix } = buildHeaderFooterExportBlocks(setup, 1);
    expect(bodyPrefix).not.toContain("<script");
    expect(bodyPrefix).not.toContain("onclick");
    expect(bodyPrefix).toContain("<b>หัว</b>");
  });

  it("emits print CSS hiding chrome on screen and showing it in print", () => {
    const setup = makePageSetup({ headerHtml: "ห" });
    const { css } = buildHeaderFooterExportBlocks(setup, 1);
    expect(css).toContain("@media print");
    expect(css).toContain(".export-page-chrome { display: none; }");
    expect(css).toContain(".export-hf-header");
    expect(css).toContain(".export-hf-footer");
  });
});

describe("countPageBreaksInHtml", () => {
  it("counts page-node wrappers when present", () => {
    const html =
      '<div class="page-node"><div class="page-body"></div></div>' +
      '<div class="page-node"><div class="page-body"></div></div>' +
      '<div class="page-node"><div class="page-body"></div></div>';
    expect(countPageBreaksInHtml(html)).toBe(3);
  });

  it("falls back to page-break markers + 1 when no page nodes exist", () => {
    const html =
      '<p>ก</p><div data-type="page-break"></div><p>ข</p><hr class="page-break"><p>ค</p>';
    expect(countPageBreaksInHtml(html)).toBe(3);
  });

  it("returns 1 for plain HTML without any pagination markers", () => {
    expect(countPageBreaksInHtml("<p>เอกสารหน้าเดียว</p>")).toBe(1);
    expect(countPageBreaksInHtml("")).toBe(1);
  });

  it("prefers page-node count over break markers when both exist", () => {
    const html =
      '<div class="page-node"><div data-type="page-break"></div></div>' +
      '<div class="page-node"></div>';
    expect(countPageBreaksInHtml(html)).toBe(2);
  });
});
