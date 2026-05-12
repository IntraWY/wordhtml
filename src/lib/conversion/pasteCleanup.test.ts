import { describe, it, expect } from "vitest";

import { cleanPastedHtml } from "./pasteCleanup";

describe("cleanPastedHtml", () => {
  it("returns empty string for empty input", () => {
    expect(cleanPastedHtml("")).toBe("");
  });

  it("removes mso-* style declarations", () => {
    const input = `<span style="mso-bidi-font-size:12pt;color:red">text</span>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("mso-bidi-font-size");
    // valid color declaration should be kept
    expect(result).toContain("color:red");
  });

  it("removes entire style attribute when only mso-* declarations remain", () => {
    const input = `<span style="mso-bidi-font-size:12pt">text</span>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("style=");
    expect(result).toContain("text");
  });

  it("removes <o:p> tags", () => {
    const input = `<p>hello<o:p></o:p></p>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("<o:p>");
    expect(result).not.toContain("</o:p>");
    expect(result).toContain("hello");
  });

  it("removes Word-specific class names like MsoNormal", () => {
    const input = `<p class="MsoNormal">paragraph</p>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("MsoNormal");
    expect(result).toContain("paragraph");
  });

  it("removes MsoBodyText and other Mso* class names", () => {
    const input = `<p class="MsoBodyText">text</p>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("MsoBodyText");
  });

  it("preserves valid HTML structure — <p>text</p> round-trips cleanly", () => {
    const input = `<p>text</p>`;
    expect(cleanPastedHtml(input)).toBe(`<p>text</p>`);
  });

  it("removes conditional comments", () => {
    const input = `<!--[if gte mso 9]><xml>foo</xml><![endif]--><p>bar</p>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("[if");
    expect(result).toContain("<p>bar</p>");
  });

  it("removes <style> blocks", () => {
    const input = `<style>.MsoNormal { font-size: 12pt; }</style><p>content</p>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("<style>");
    expect(result).toContain("content");
  });

  it("removes xmlns attributes", () => {
    const input = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><p>hi</p></html>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("xmlns");
  });

  it("removes <w:*> and other Office namespace tags", () => {
    const input = `<p>text<w:bookmarkStart w:id="0" w:name="_GoBack"/></p>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("<w:");
    expect(result).toContain("text");
  });

  it("preserves mixed valid styles while stripping mso-* only", () => {
    const input = `<p style="mso-margin-top-alt:auto; font-weight:bold; mso-margin-bottom-alt:auto">hi</p>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("mso-margin");
    expect(result).toContain("font-weight:bold");
  });

  it("unwraps <div> tags that wrap block-level children", () => {
    const input = `<div><p>Paragraph 1</p><p>Paragraph 2</p></div>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("<div>");
    expect(result).toContain("<p>Paragraph 1</p>");
    expect(result).toContain("<p>Paragraph 2</p>");
  });

  it("converts <div> with <br> separators into multiple <p> paragraphs", () => {
    const input = `<div>Line 1<br>Line 2<br>Line 3</div>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("<div>");
    expect(result).toContain("<p>Line 1</p>");
    expect(result).toContain("<p>Line 2</p>");
    expect(result).toContain("<p>Line 3</p>");
  });

  it("splits <p> tags at direct <br> children into separate paragraphs", () => {
    const input = `<p>First line<br>Second line</p>`;
    const result = cleanPastedHtml(input);
    expect(result).toContain("<p>First line</p>");
    expect(result).toContain("<p>Second line</p>");
  });

  it("preserves <br> inside inline spans without splitting the paragraph", () => {
    const input = `<p><span>Line 1<br>Line 2</span></p>`;
    const result = cleanPastedHtml(input);
    // Should NOT split because <br> is inside <span>, not a direct child of <p>
    expect(result).toContain("<p>");
    expect(result).toContain("<span>Line 1<br>Line 2</span>");
  });
});
