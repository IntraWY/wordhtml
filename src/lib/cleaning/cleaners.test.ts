import { describe, it, expect } from "vitest";

import {
  removeInlineStyles,
  removeEmptyTags,
  collapseSpaces,
  removeAttributes,
  removeClassesAndIds,
  removeComments,
  unwrapSpans,
  plainText,
} from "./cleaners";

describe("removeInlineStyles", () => {
  it("strips style attribute from every element", () => {
    const html = `<p style="color:red"><span style="font-weight:bold">x</span></p>`;
    expect(removeInlineStyles(html)).toBe(`<p><span>x</span></p>`);
  });

  it("leaves elements without style alone", () => {
    expect(removeInlineStyles(`<p>x</p>`)).toBe(`<p>x</p>`);
  });

  it("returns empty string for empty input", () => {
    expect(removeInlineStyles("")).toBe("");
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
