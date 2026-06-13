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

  it("strips editor page wrappers from pasted html (no ghost pages)", () => {
    const html = `<div class="page-node"><div class="page-body"><p>X</p></div></div>`;
    const out = cleanPastedHtml(html);
    expect(out).not.toContain("page-node");
    expect(out).not.toContain("page-body");
    expect(out).toContain("X");
  });

  it("drops pasted page-break separators", () => {
    const html = `<p>A</p><div class="page-break"></div><p>B</p>`;
    const out = cleanPastedHtml(html);
    expect(out).not.toContain("page-break");
    expect(out).toContain("A");
    expect(out).toContain("B");
  });
});

/**
 * Paste + Enter bug (roadmap Phase 1.1): cleaned output must be a flat,
 * splittable paragraph structure — no block content trapped inside inline
 * wrappers, no loose inline content at the top level. Otherwise Tiptap maps
 * the paste to nodes that Enter/splitBlock cannot split cleanly.
 */

const BLOCK_LEVEL = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "table",
  "blockquote",
  "pre",
  "figure",
  "hr",
  "img",
]);

function assertSplittableStructure(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // 1. Every top-level node must be a block element (no loose text/inline).
  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      expect((node.textContent ?? "").trim()).toBe("");
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName.toLowerCase();
      expect(BLOCK_LEVEL.has(tag), `top-level <${tag}> is not block-level`).toBe(
        true
      );
    }
  }

  // 2. No inline element may contain block-level content.
  const inlineTags =
    "span,b,strong,i,em,u,s,strike,font,mark,sub,sup,big,small";
  for (const el of Array.from(doc.body.querySelectorAll(inlineTags))) {
    expect(
      el.querySelector("p,div,h1,h2,h3,h4,h5,h6,ul,ol,table,blockquote"),
      `<${el.tagName.toLowerCase()}> traps block content`
    ).toBeNull();
  }
}

describe("cleanPastedHtml — splittable paragraph structure (Paste+Enter)", () => {
  it("unwraps the Google Docs <b id=docs-internal-guid> wrapper around paragraphs", () => {
    const input = `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1a2b3c"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial;">Line A</span></p><p dir="ltr"><span style="font-size:11pt;">Line B</span></p></b>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("docs-internal-guid");
    expect(result).not.toMatch(/<b[\s>]/i);
    expect(result).toContain("Line A");
    expect(result).toContain("Line B");
    assertSplittableStructure(result);
  });

  it("unwraps a <span> that wraps block-level children", () => {
    const input = `<span style="color:red"><p>One</p><p>Two</p></span>`;
    const result = cleanPastedHtml(input);
    expect(result).toContain("<p>One</p>");
    expect(result).toContain("<p>Two</p>");
    assertSplittableStructure(result);
  });

  it("keeps inline formatting tags that contain only inline content", () => {
    const input = `<p><b>bold</b> and <span style="color:red">red</span></p>`;
    const result = cleanPastedHtml(input);
    expect(result).toContain("<b>bold</b>");
    expect(result).toContain(`<span style="color:red">red</span>`);
  });

  it("strips unquoted Word class attributes (class=MsoNormal)", () => {
    const input = `<p class=MsoNormal>text</p>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("MsoNormal");
    expect(result).toContain("text");
  });

  it("does not mangle single-quoted style attrs containing double-quoted font names (Thai Word paste)", () => {
    const input = `<p class=MsoNormal><span lang=TH style='font-size:16.0pt;font-family:"TH SarabunPSK",sans-serif;mso-fareast-font-family:"Times New Roman"'>ข้อความ<o:p></o:p></span></p>`;
    const result = cleanPastedHtml(input);
    // The old quote-naive regex produced garbage attributes like th="" sarabunpsk",sans-serif'=""
    expect(result).not.toContain(`th=""`);
    expect(result).not.toContain(`sarabunpsk`);
    expect(result).not.toContain("mso-fareast-font-family");
    expect(result).toContain("TH SarabunPSK");
    expect(result).toContain("font-size:16.0pt");
    expect(result).toContain("ข้อความ");
    assertSplittableStructure(result);
  });

  it("wraps loose br-separated inline content at the top level into paragraphs", () => {
    const input = `Line 1<br>Line 2<br>Line 3`;
    const result = cleanPastedHtml(input);
    expect(result).toContain("<p>Line 1</p>");
    expect(result).toContain("<p>Line 2</p>");
    expect(result).toContain("<p>Line 3</p>");
    assertSplittableStructure(result);
  });

  it("wraps loose text exposed by unwrapping mixed divs into paragraphs", () => {
    const input = `<div>loose text<p>para</p>more loose</div>`;
    const result = cleanPastedHtml(input);
    expect(result).toContain("<p>loose text</p>");
    expect(result).toContain("<p>para</p>");
    expect(result).toContain("<p>more loose</p>");
    assertSplittableStructure(result);
  });

  it("produces splittable structure from a realistic full Word clipboard payload", () => {
    const input = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<style><!-- p.MsoNormal { mso-style-parent:""; font-size:16.0pt; } --></style>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Normal</w:View></w:WordDocument></xml><![endif]-->
</head>
<body lang=TH style='tab-interval:36.0pt'>
<div class=WordSection1>
<p class=MsoNormal><span lang=TH style='font-size:16.0pt;font-family:"TH SarabunPSK",sans-serif'>ย่อหน้าแรก<o:p></o:p></span></p>
<p class=MsoNormal><b><span lang=TH style='font-size:16.0pt'>ย่อหน้าสอง</span></b><o:p></o:p></p>
<div><span lang=TH>บรรทัดหนึ่ง</span><br><span lang=TH>บรรทัดสอง</span></div>
</div>
</body>
</html>`;
    const result = cleanPastedHtml(input);
    expect(result).not.toContain("WordSection1");
    expect(result).not.toContain("MsoNormal");
    expect(result).not.toContain("mso-");
    expect(result).not.toContain("<o:p>");
    expect(result).toContain("ย่อหน้าแรก");
    expect(result).toContain("ย่อหน้าสอง");
    expect(result).toContain("บรรทัดหนึ่ง");
    expect(result).toContain("บรรทัดสอง");
    assertSplittableStructure(result);
  });
});
