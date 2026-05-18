import { describe, it, expect } from "vitest";

import { htmlToMarkdown } from "./exportMarkdown";

describe("htmlToMarkdown", () => {
  it("converts headings", async () => {
    expect(await htmlToMarkdown("<h1>Title</h1>")).toBe("# Title");
    expect(await htmlToMarkdown("<h2>Sub</h2>")).toBe("## Sub");
  });

  it("converts inline marks", async () => {
    expect(await htmlToMarkdown("<strong>bold</strong>")).toBe("**bold**");
    expect(await htmlToMarkdown("<em>italic</em>")).toBe("*italic*");
    expect(await htmlToMarkdown("<s>strike</s>")).toBe("~~strike~~");
  });

  it("converts lists", async () => {
    const md = await htmlToMarkdown("<ul><li>a</li><li>b</li></ul>");
    // turndown uses "-" as the bullet marker; whitespace between marker and
    // text may be one or more spaces depending on indent level.
    expect(md).toMatch(/-\s+a/);
    expect(md).toMatch(/-\s+b/);
  });

  it("converts links and images", async () => {
    expect(await htmlToMarkdown('<a href="http://x.com">link</a>')).toBe(
      "[link](http://x.com)"
    );
    expect(await htmlToMarkdown('<img src="x.png" alt="logo">')).toBe(
      "![logo](x.png)"
    );
  });

  it("converts code blocks fenced", async () => {
    const md = await htmlToMarkdown("<pre><code>const a = 1;</code></pre>");
    expect(md).toContain("```");
    expect(md).toContain("const a = 1;");
  });

  it("converts simple table to GFM", async () => {
    const html =
      "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>";
    const md = await htmlToMarkdown(html);
    expect(md).toContain("| A | B |");
    expect(md).toContain("| --- | --- |");
    expect(md).toContain("| 1 | 2 |");
  });

  it("returns empty string for empty input", async () => {
    expect(await htmlToMarkdown("")).toBe("");
  });
});
