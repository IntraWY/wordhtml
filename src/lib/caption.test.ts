import { describe, it, expect } from "vitest";
import {
  captionLabel,
  nextCaptionNumber,
  buildCaptionHtml,
} from "./caption";

describe("captionLabel", () => {
  it("maps kinds to Thai labels", () => {
    expect(captionLabel("figure")).toBe("รูปที่");
    expect(captionLabel("table")).toBe("ตารางที่");
  });
});

describe("nextCaptionNumber", () => {
  it("starts at 1 for empty/no captions", () => {
    expect(nextCaptionNumber("", "figure")).toBe(1);
    expect(nextCaptionNumber("<p>hi</p>", "figure")).toBe(1);
  });

  it("counts existing captions of the same kind", () => {
    const html =
      `<p data-caption="figure">รูปที่ 1</p>` +
      `<p data-caption="figure">รูปที่ 2</p>` +
      `<p data-caption="table">ตารางที่ 1</p>`;
    expect(nextCaptionNumber(html, "figure")).toBe(3);
    expect(nextCaptionNumber(html, "table")).toBe(2);
  });
});

describe("buildCaptionHtml", () => {
  it("renders numbered caption with text", () => {
    const html = buildCaptionHtml("figure", 2, "แผนผังระบบ");
    expect(html).toContain('data-caption="figure"');
    expect(html).toContain("รูปที่ 2: แผนผังระบบ");
  });

  it("renders label + number only when no text", () => {
    expect(buildCaptionHtml("table", 1)).toContain("ตารางที่ 1");
  });

  it("escapes HTML in caption text", () => {
    const html = buildCaptionHtml("figure", 1, "<b>x</b>");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
