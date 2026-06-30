import { describe, it, expect } from "vitest";

import {
  removeInlineStyles,
  removeEmptyTags,
  collapseSpaces,
  removeAttributes,
  removeClassesAndIds,
  removeComments,
  unwrapDeprecatedTags,
  unwrapSpans,
  plainText,
} from "./cleaners";

describe("removeInlineStyles", () => {
  it("preserves export-relevant styles and strips Word junk", () => {
    const html = `<p style="color:red"><span style="font-weight:bold">x</span></p>`;
    expect(removeInlineStyles(html)).toBe(`<p style="color: red;"><span>x</span></p>`);
  });

  it("leaves elements without style alone", () => {
    expect(removeInlineStyles(`<p>x</p>`)).toBe(`<p>x</p>`);
  });

  it("returns empty string for empty input", () => {
    expect(removeInlineStyles("")).toBe("");
  });

  it("preserves font-family style so applied fonts survive export", () => {
    const html = `<p><span style="font-family:Sarabun;font-weight:bold">x</span></p>`;
    const result = removeInlineStyles(html);
    expect(result).toMatch(/font-family:\s*Sarabun/);
    // font-weight is NOT in KEEP — must be stripped
    expect(result).not.toMatch(/font-weight/);
  });

  it("preserves the border style on borderless form cells", () => {
    const html = `<table><tbody><tr><td style="border:none" data-borders="none">x</td></tr></tbody></table>`;
    const result = removeInlineStyles(html);
    // jsdom re-serializes the border shorthand ("border: medium"); assert the
    // property survives the KEEP filter rather than its exact value.
    expect(result).toMatch(/style="[^"]*border/);
    expect(result).toContain(`data-borders="none"`);
  });

  it("preserves absolute positioning on floating images", () => {
    const html = `<img src="x.png" data-float="true" style="position:absolute;left:120px;top:60px;z-index:5" />`;
    const result = removeInlineStyles(html);
    expect(result).toMatch(/position:\s*absolute/);
    expect(result).toMatch(/left:\s*120px/);
    expect(result).toMatch(/top:\s*60px/);
    expect(result).toMatch(/z-index:\s*5/);
  });

  it("strips position on NON-floating images (no data-float)", () => {
    const html = `<img src="x.png" style="position:absolute;left:120px;top:60px;width:200px" />`;
    const result = removeInlineStyles(html);
    expect(result).not.toMatch(/position/);
    expect(result).not.toMatch(/left:/);
    expect(result).not.toMatch(/top:/);
    // width (a structural KEEP prop) still survives
    expect(result).toMatch(/width:\s*200px/);
  });

  it("strips positioned Word/Office junk on non-image elements", () => {
    const html = `<p style="position:absolute;left:5px;top:10px">x</p>`;
    const result = removeInlineStyles(html);
    expect(result).not.toMatch(/position/);
    expect(result).not.toMatch(/left:/);
    expect(result).not.toMatch(/top:/);
  });
});

describe("removeEmptyTags", () => {
  it("removes a single empty paragraph", () => {
    expect(removeEmptyTags(`<p></p>`)).toBe(``);
  });

  it("removes nested empty tags iteratively", () => {
    expect(removeEmptyTags(`<div><p><span></span></p></div>`)).toBe(``);
  });

  it("keeps tags containing text", () => {
    expect(removeEmptyTags(`<p>hi</p>`)).toBe(`<p>hi</p>`);
  });

  it("keeps tags wrapping images", () => {
    const html = `<p><img src="a.png" alt="a"></p>`;
    expect(removeEmptyTags(html)).toBe(html);
  });

  it("removes whitespace-only paragraphs", () => {
    expect(removeEmptyTags(`<p>   </p>`)).toBe(``);
  });
});

describe("collapseSpaces", () => {
  it("collapses double spaces in text", () => {
    expect(collapseSpaces(`<p>hello    world</p>`)).toBe(`<p>hello world</p>`);
  });

  it("preserves single spaces", () => {
    expect(collapseSpaces(`<p>a b c</p>`)).toBe(`<p>a b c</p>`);
  });

  it("preserves a single tab character (Word tab stop)", () => {
    expect(collapseSpaces("<p>a\tb</p>")).toContain("\t");
  });

  it("preserves multiple consecutive tabs (does not collapse them)", () => {
    expect(collapseSpaces("<p>a\t\tb</p>")).toContain("\t\t");
  });

  it("keeps a tab that sits between spaces", () => {
    const out = collapseSpaces("<p>a \t b</p>");
    expect(out).toContain("\t");
  });
});

describe("removeAttributes", () => {
  it("removes most attributes", () => {
    const html = `<p class="x" id="y" data-foo="z">text</p>`;
    expect(removeAttributes(html)).toBe(`<p>text</p>`);
  });

  it("preserves href on anchors", () => {
    const html = `<a href="https://x.com" class="y" data-bar="1">link</a>`;
    expect(removeAttributes(html)).toBe(`<a href="https://x.com">link</a>`);
  });

  it("preserves src and alt on images", () => {
    const html = `<img src="a.png" alt="a" class="x" data-y="1">`;
    expect(removeAttributes(html)).toBe(`<img src="a.png" alt="a">`);
  });

  it("preserves data-borders on table cells (borderless form zones)", () => {
    const html = `<table><tbody><tr><td data-borders="none" align="left">x</td></tr></tbody></table>`;
    const result = removeAttributes(html);
    expect(result).toContain(`data-borders="none"`);
    expect(result).not.toContain("align=");
  });

  it("preserves colwidth/colspan/rowspan on table cells (column widths survive export)", () => {
    const html = `<table><tbody><tr><td colspan="2" rowspan="1" colwidth="130,140" class="z">x</td></tr></tbody></table>`;
    const result = removeAttributes(html);
    expect(result).toContain(`colwidth="130,140"`);
    expect(result).toContain(`colspan="2"`);
    expect(result).not.toContain("class=");
  });

  it("preserves data-float on floating images", () => {
    const html = `<img src="a.png" data-float="true" class="x">`;
    const result = removeAttributes(html);
    expect(result).toContain(`data-float="true"`);
    expect(result).not.toContain("class=");
  });
});

describe("removeClassesAndIds", () => {
  it("removes class and id attributes", () => {
    const html = `<p class="a" id="b" data-x="y">text</p>`;
    expect(removeClassesAndIds(html)).toBe(`<p data-x="y">text</p>`);
  });

  it("leaves other attributes intact", () => {
    expect(removeClassesAndIds(`<a href="x">y</a>`)).toBe(`<a href="x">y</a>`);
  });
});

describe("removeComments", () => {
  it("removes top-level comments", () => {
    expect(removeComments(`<!-- hi --><p>x</p>`)).toBe(`<p>x</p>`);
  });

  it("removes nested comments", () => {
    expect(removeComments(`<p>x<!-- y -->z</p>`)).toBe(`<p>xz</p>`);
  });
});

describe("unwrapDeprecatedTags", () => {
  it("unwraps <font> but keeps text", () => {
    expect(unwrapDeprecatedTags(`<font color="red">text</font>`)).toBe(`text`);
  });

  it("unwraps <center> while keeping inner blocks", () => {
    expect(unwrapDeprecatedTags(`<center><p>x</p></center>`)).toBe(`<p>x</p>`);
  });

  it("unwraps nested deprecated tags", () => {
    expect(unwrapDeprecatedTags(`<font><big>x</big></font>`)).toBe(`x`);
  });

  it("unwraps <strike>", () => {
    expect(unwrapDeprecatedTags(`<strike>old</strike>`)).toBe(`old`);
  });

  it("unwraps <tt>", () => {
    expect(unwrapDeprecatedTags(`<tt>code</tt>`)).toBe(`code`);
  });

  it("leaves plain HTML untouched", () => {
    const html = `<p><strong>hi</strong></p>`;
    expect(unwrapDeprecatedTags(html)).toBe(html);
  });

  it("returns empty input untouched", () => {
    expect(unwrapDeprecatedTags("")).toBe("");
  });
});

describe("unwrapSpans", () => {
  it("removes span but keeps content", () => {
    expect(unwrapSpans(`<p><span>hi</span></p>`)).toBe(`<p>hi</p>`);
  });

  it("preserves nested formatting", () => {
    expect(unwrapSpans(`<p><span><strong>hi</strong></span></p>`)).toBe(
      `<p><strong>hi</strong></p>`
    );
  });

  it("handles multiple sibling spans", () => {
    expect(unwrapSpans(`<p><span>a</span><span>b</span></p>`)).toBe(`<p>ab</p>`);
  });
});

describe("plainText", () => {
  it("strips tags", () => {
    expect(plainText(`<p>hi <strong>there</strong></p>`)).toBe(`hi there`);
  });

  it("inserts line breaks between blocks", () => {
    expect(plainText(`<p>a</p><p>b</p>`)).toMatch(/a\s*\n+\s*b/);
  });

  it("returns empty string for empty input", () => {
    expect(plainText("")).toBe("");
  });
});
