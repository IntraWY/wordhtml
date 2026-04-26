import { describe, it, expect } from "vitest";

import { applyCleaners } from "./pipeline";

describe("applyCleaners", () => {
  it("returns input unchanged when no cleaners enabled", () => {
    const html = `<p style="color:red"><span>hi</span></p>`;
    expect(applyCleaners(html, [])).toBe(html);
  });

  it("applies a single cleaner", () => {
    const html = `<p style="color:red">hi</p>`;
    expect(applyCleaners(html, ["removeInlineStyles"])).toBe(`<p>hi</p>`);
  });

  it("composes multiple cleaners in correct order", () => {
    const html = `<p class="a" style="color:red"><span>hi</span></p>`;
    const out = applyCleaners(html, [
      "removeInlineStyles",
      "removeClassesAndIds",
      "unwrapSpans",
    ]);
    expect(out).toBe(`<p>hi</p>`);
  });

  it("removeEmptyTags runs after other cleaners", () => {
    // After removing the style attribute and unwrapping the span, the <p> would
    // still have meaningful text. But after stripping every tag attribute and
    // unwrapping spans, an empty span becomes nothing — and the surrounding
    // <p> stays because it has text.
    const html = `<p>hi<span style="color:red"></span></p>`;
    const out = applyCleaners(html, [
      "removeInlineStyles",
      "unwrapSpans",
      "removeEmptyTags",
    ]);
    expect(out).toBe(`<p>hi</p>`);
  });

  it("plainText is terminal", () => {
    const html = `<h1>title</h1><p>body</p>`;
    const out = applyCleaners(html, ["plainText"]);
    expect(out).toMatch(/title/);
    expect(out).toMatch(/body/);
    expect(out).not.toMatch(/</);
  });

  it("ignores empty input", () => {
    expect(applyCleaners("", ["removeInlineStyles"])).toBe("");
  });

  it("runs unwrapSpans BEFORE removeEmptyTags (order regression)", () => {
    // <span> with no content should be unwrapped first, leaving an empty parent,
    // which removeEmptyTags then cleans. Verifies order in pipeline.ts ORDER array.
    const input = "<p><span></span></p>";
    const result = applyCleaners(input, ["unwrapSpans", "removeEmptyTags"]);
    expect(result).toBe(""); // both empty p and span removed
  });
});
