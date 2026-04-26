import { describe, it, expect } from "vitest";

import { htmlToMarkdown } from "./exportMarkdown";

describe("htmlToMarkdown", () => {
  it("converts headings", () => {
    expect(htmlToMarkdown("<h1>Title</h1>")).toBe("# Title");
    expect(htmlToMarkdown("<h2>Sub</h2>")).toBe("## Sub");
  });

  it("converts inline marks", () => {
    expect(htmlToMarkdown("<strong>bold</strong>")).toBe("**bold**");
    expect(htmlToMarkdown("<em>italic</em>")).toBe("*italic*");
    expect(htmlToMarkdown("<s>strike</s>")).toBe("~~strike~~");
  });

  it("converts lists", () => {
    const md = htmlToMarkdown("<ul><li>a</li><li>b</li></ul>");
    // turndown uses "-" as the bullet marker; whitespace between marker and
    // text may be one or more spaces depending on indent level.
    expect(md).toMatch(/-\s+a/);
    expect(md).toMatch(/-\s+b/);
  });

  it("converts links and images", () => {
    expect(htmlToMarkdown('<a href="http://x.com">link</a>')).toBe(
      "[link](http://x.com)"
    );
    expect(htmlToMarkdown('<img src="x.png" alt="logo">')).toBe(
      "![logo](x.png)"
    );
  });

  it("converts code blocks fenced", () => {
    const md = htmlToMarkdown("<pre><code>const a = 1;</code></pre>");
    expect(md).toContain("```");
    expect(md).toContain("const a = 1;");
  });

  it("converts simple table to GFM", () => {
    const html =
      "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>";
    const md = htmlToMarkdown(html);
    expect(md).toContain("| A | B |");
    expect(md).toContain("| --- | --- |");
    expect(md).toContain("| 1 | 2 |");
  });

  it("returns empty string for empty input", () => {
    expect(htmlToMarkdown("")).toBe("");
  });
});
