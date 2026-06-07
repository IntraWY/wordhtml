import { describe, it, expect } from "vitest";
import {
  nextFootnoteNumber,
  buildFootnoteRefHtml,
  buildFootnoteNoteHtml,
} from "./footnotes";

describe("nextFootnoteNumber", () => {
  it("starts at 1", () => {
    expect(nextFootnoteNumber("")).toBe(1);
    expect(nextFootnoteNumber("<p>hi</p>")).toBe(1);
  });
  it("counts existing notes", () => {
    const html =
      `<p data-footnote="1">1. a</p><p data-footnote="2">2. b</p>`;
    expect(nextFootnoteNumber(html)).toBe(3);
  });
});

describe("buildFootnoteRefHtml", () => {
  it("renders a superscript number", () => {
    expect(buildFootnoteRefHtml(3)).toBe("<sup>3</sup>");
  });
});

describe("buildFootnoteNoteHtml", () => {
  it("renders a numbered note with data-footnote", () => {
    const html = buildFootnoteNoteHtml(2, "อ้างอิงจากระเบียบ");
    expect(html).toContain('data-footnote="2"');
    expect(html).toContain("2. อ้างอิงจากระเบียบ");
  });
  it("escapes HTML in the note text", () => {
    expect(buildFootnoteNoteHtml(1, "<b>x</b>")).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
