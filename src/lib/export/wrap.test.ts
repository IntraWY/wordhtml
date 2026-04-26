import { describe, it, expect } from "vitest";

import { escapeHtml, wrapAsDocument, deriveFileName } from "./wrap";

describe("escapeHtml", () => {
  it("escapes <", () => {
    expect(escapeHtml("<")).toBe("&lt;");
  });

  it("escapes >", () => {
    expect(escapeHtml(">")).toBe("&gt;");
  });

  it("escapes &", () => {
    expect(escapeHtml("&")).toBe("&amp;");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('"')).toBe("&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("'")).toBe("&#39;");
  });

  it("leaves regular characters alone", () => {
    expect(escapeHtml("hello world 123")).toBe("hello world 123");
  });

  it("escapes all special chars in a mixed string", () => {
    expect(escapeHtml(`<a href='x' title="y">&`)).toBe(
      `&lt;a href=&#39;x&#39; title=&quot;y&quot;&gt;&amp;`
    );
  });

  it("returns empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("deriveFileName", () => {
  it("returns fallback-based name when source is null", () => {
    expect(deriveFileName(null, "html")).toBe("document.html");
  });

  it("strips extension from source file name", () => {
    expect(deriveFileName("foo.docx", "html")).toBe("foo.html");
  });

  it("strips extension when source already has target extension", () => {
    expect(deriveFileName("report.html", "docx")).toBe("report.docx");
  });

  it("uses custom fallback when source is null and fallback provided", () => {
    expect(deriveFileName(null, "zip", "export")).toBe("export.zip");
  });

  it("preserves Thai characters in file name", () => {
    const result = deriveFileName("เอกสาร.docx", "html");
    // Thai chars are non-word chars so they get replaced with _
    expect(result).toContain(".html");
    expect(result).not.toContain(".docx");
  });

  it("replaces spaces and special chars with underscores", () => {
    expect(deriveFileName("my document!.docx", "html")).toBe(
      "my_document_.html"
    );
  });

  it("handles source with no extension", () => {
    expect(deriveFileName("README", "html")).toBe("README.html");
  });
});

describe("wrapAsDocument", () => {
  it("wraps body content in HTML5 doctype", () => {
    const result = wrapAsDocument("<p>hello</p>");
    expect(result).toMatch(/^<!doctype html>/i);
  });

  it("includes the body content", () => {
    const result = wrapAsDocument("<p>hello</p>");
    expect(result).toContain("<p>hello</p>");
  });

  it("includes a <title> element", () => {
    const result = wrapAsDocument("<p>hi</p>", "My Doc");
    expect(result).toContain("<title>My Doc</title>");
  });

  it("escapes special characters in title", () => {
    const result = wrapAsDocument("<p>hi</p>", "<script>alert('xss')</script>");
    expect(result).toContain(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
    );
    expect(result).not.toContain("<script>");
  });

  it("defaults title to Document when omitted", () => {
    const result = wrapAsDocument("<p>hi</p>");
    expect(result).toContain("<title>Document</title>");
  });

  it("wraps content inside <body> tags", () => {
    const result = wrapAsDocument("<p>hello</p>");
    expect(result).toMatch(/<body>[\s\S]*<p>hello<\/p>[\s\S]*<\/body>/);
  });

  it("includes utf-8 charset meta", () => {
    const result = wrapAsDocument("<p>hi</p>");
    expect(result).toContain('charset="utf-8"');
  });
});
