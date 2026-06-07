import { describe, it, expect } from "vitest";
import {
  nextCitationNumber,
  buildCitationRefHtml,
  buildBibliographyEntryHtml,
} from "./citations";

describe("nextCitationNumber", () => {
  it("starts at 1", () => {
    expect(nextCitationNumber("")).toBe(1);
    expect(nextCitationNumber("<p>x</p>")).toBe(1);
  });
  it("counts existing bibliography entries", () => {
    const html = `<p data-citation="1">[1] a</p><p data-citation="2">[2] b</p>`;
    expect(nextCitationNumber(html)).toBe(3);
  });
});

describe("buildCitationRefHtml", () => {
  it("renders a bracketed number", () => {
    expect(buildCitationRefHtml(2)).toBe("[2]");
  });
});

describe("buildBibliographyEntryHtml", () => {
  it("renders a numbered entry with data-citation", () => {
    const html = buildBibliographyEntryHtml(3, "ผู้แต่ง, ชื่อเรื่อง, ๒๕๖๙");
    expect(html).toContain('data-citation="3"');
    expect(html).toContain("[3] ผู้แต่ง, ชื่อเรื่อง, ๒๕๖๙");
  });
  it("escapes HTML in the entry", () => {
    expect(buildBibliographyEntryHtml(1, "<b>x</b>")).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
