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

  it("unwraps <section> tags that wrap block-level children", () => {
    const input = `<section><p>Paragraph 1</p><p>Paragraph 2</p></section>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("<section>");
    expect(result).toContain("<p>Paragraph 1</p>");
    expect(result).toContain("<p>Paragraph 2</p>");
  });

  it("unwraps <article> tags that wrap block-level children", () => {
    const input = `<article><h2>Title</h2><p>Content</p></article>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("<article>");
    expect(result).toContain("<h2>Title</h2>");
    expect(result).toContain("<p>Content</p>");
  });

  it("converts <section> with <br> separators into multiple <p> paragraphs", () => {
    const input = `<section>Line 1<br>Line 2</section>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("<section>");
    expect(result).toContain("<p>Line 1</p>");
    expect(result).toContain("<p>Line 2</p>");
  });

  it("unwraps nested semantic wrappers (article > section > div > p)", () => {
    const input = `<article><section><div><p>Deep nested</p></div></section></article>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("<article>");
    expect(result).not.toContain("<section>");
    expect(result).not.toContain("<div>");
    expect(result).toContain("<p>Deep nested</p>");
  });

  it("unwraps <main>, <header>, <footer>, <aside>, <nav> wrappers with block children", () => {
    const input = `<main><p>Main content</p></main><header><h1>Title</h1></header><footer><p>Footer</p></footer><aside><p>Aside</p></aside><nav><p>Nav</p></nav>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("<main>");
    expect(result).not.toContain("<header>");
    expect(result).not.toContain("<footer>");
    expect(result).not.toContain("<aside>");
    expect(result).not.toContain("<nav>");
    expect(result).toContain("<p>Main content</p>");
    expect(result).toContain("<h1>Title</h1>");
    expect(result).toContain("<p>Footer</p>");
    expect(result).toContain("<p>Aside</p>");
    expect(result).toContain("<p>Nav</p>");
  });

  it("does not unwrap <figure> elements (preserve semantic structure)", () => {
    const input = `<figure><img src="a.png" alt="a"><figcaption>Caption</figcaption></figure>`;
    const result = cleanPastedHtml(input);
    expect(result).toContain("<figure>");
    expect(result).toContain("<img src=\"a.png\" alt=\"a\">");
    expect(result).toContain("<figcaption>Caption</figcaption>");
  });

  it("handles realistic Word paste: single wrapper div with mso classes and multiple paragraphs", () => {
    const input = `
      <div class="WordSection1">
        <p class="MsoNormal">First paragraph</p>
        <p class="MsoNormal">Second paragraph</p>
      </div>
    `;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("WordSection1");
    expect(result).not.toContain("MsoNormal");
    expect(result).not.toContain("<div>");
    expect(result).toContain("<p>First paragraph</p>");
    expect(result).toContain("<p>Second paragraph</p>");
  });

  it("handles realistic Word paste: nested divs with br-separated lines", () => {
    const input = `
      <div class="WordSection1">
        <div>Line one<br>Line two<br>Line three</div>
      </div>
    `;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("<div>");
    expect(result).toContain("<p>Line one</p>");
    expect(result).toContain("<p>Line two</p>");
    expect(result).toContain("<p>Line three</p>");
  });
});
