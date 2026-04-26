import { describe, it, expect } from "vitest";

import { loadHtmlFile } from "./loadHtmlFile";

function makeFile(content: string, name = "test.html"): File {
  return new File([content], name, { type: "text/html" });
}

describe("loadHtmlFile", () => {
  it("extracts body content from a full HTML document", async () => {
    const html = `<!DOCTYPE html><html><head><title>T</title></head><body><p>hello</p></body></html>`;
    const result = await loadHtmlFile(makeFile(html));
    expect(result).toContain("<p>hello</p>");
    expect(result).not.toContain("<html");
    expect(result).not.toContain("<head");
    expect(result).not.toContain("<body");
  });

  it("returns fragment as-is when there is no <body> tag", async () => {
    const fragment = "<p>just a fragment</p>";
    const result = await loadHtmlFile(makeFile(fragment));
    expect(result).toContain("just a fragment");
  });

  it("returns empty string for empty file", async () => {
    const result = await loadHtmlFile(makeFile(""));
    expect(result).toBe("");
  });

  it("strips doctype and html/head wrappers from fragment-like input", async () => {
    const html = `<!DOCTYPE html><html><head></head><p>content</p></html>`;
    const result = await loadHtmlFile(makeFile(html));
    expect(result).toContain("content");
    expect(result).not.toMatch(/<!doctype/i);
    expect(result).not.toMatch(/<html/i);
    expect(result).not.toMatch(/<head/i);
  });

  it("runs paste cleanup to remove mso-* noise from loaded file", async () => {
    const html = `<body><p class="MsoNormal">text</p></body>`;
    const result = await loadHtmlFile(makeFile(html));
    // MsoNormal class should be stripped by cleanPastedHtml
    expect(result).not.toContain("MsoNormal");
    expect(result).toContain("text");
  });

  it("handles multiline body content correctly", async () => {
    const html = `<html><body>\n<h1>Title</h1>\n<p>Body</p>\n</body></html>`;
    const result = await loadHtmlFile(makeFile(html));
    expect(result).toContain("<h1>Title</h1>");
    expect(result).toContain("<p>Body</p>");
  });
});
