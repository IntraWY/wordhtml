import { describe, it, expect } from "vitest";

import { plainTextFromHtml, countWords } from "./text";

describe("plainTextFromHtml", () => {
  it("strips HTML tags", () => {
    expect(plainTextFromHtml("<p>hello <strong>world</strong></p>")).toBe(
      "hello world"
    );
  });

  it("collapses whitespace", () => {
    expect(plainTextFromHtml("<p>hello    world\n\n\t  again</p>")).toBe(
      "hello world again"
    );
  });

  it("returns empty string for empty input", () => {
    expect(plainTextFromHtml("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(plainTextFromHtml("   \n\t  ")).toBe("");
  });

  it("returns empty string for tags-only input", () => {
    expect(plainTextFromHtml("<p></p><div></div>")).toBe("");
  });
});

describe("countWords", () => {
  it("counts English words", () => {
    expect(countWords("<p>hello world</p>")).toBe(2);
  });

  it("counts words after HTML stripping", () => {
    expect(countWords("<b>hello</b> <i>world</i>")).toBe(2);
  });

  it("counts a longer phrase", () => {
    expect(countWords("<p>the quick brown fox jumps</p>")).toBe(5);
  });

  it("returns 0 for empty input", () => {
    expect(countWords("")).toBe(0);
  });

  it("returns 0 for whitespace-only input", () => {
    expect(countWords("   ")).toBe(0);
  });

  it("returns 0 for empty tags", () => {
    expect(countWords("<p></p>")).toBe(0);
  });

  it("counts Thai segments", () => {
    // Thai has no spaces; Intl.Segmenter('th') breaks "ผมชื่อจอห์น"
    // into multiple word-like segments.
    const n = countWords("ผมชื่อจอห์น");
    expect(n).toBeGreaterThanOrEqual(2);
  });
});
