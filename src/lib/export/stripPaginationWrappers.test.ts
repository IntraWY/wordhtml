import { describe, it, expect } from "vitest";
import { stripPaginationWrappers } from "./stripPaginationWrappers";

describe("stripPaginationWrappers", () => {
  it("returns html unchanged when no pagination wrappers exist", () => {
    const html = `<p>Hello world</p>`;
    expect(stripPaginationWrappers(html)).toBe(html);
  });

  it("strips .page-node and .page-body while preserving inner content", () => {
    const html = `
      <div class="page-node" data-page-number="1">
        <div class="page-body" data-page-body="true">
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
        </div>
      </div>
    `;
    const result = stripPaginationWrappers(html);
    expect(result).toContain("<p>Paragraph 1</p>");
    expect(result).toContain("<p>Paragraph 2</p>");
    expect(result).not.toContain("page-node");
    expect(result).not.toContain("page-body");
  });

  it("handles nested .page-node structures", () => {
    const html = `
      <div class="page-node" data-page-number="1">
        <div class="page-body">
          <p>Page 1 content</p>
        </div>
      </div>
      <div class="page-node" data-page-number="2">
        <div class="page-body">
          <p>Page 2 content</p>
        </div>
      </div>
    `;
    const result = stripPaginationWrappers(html);
    expect(result).toContain("<p>Page 1 content</p>");
    expect(result).toContain("<p>Page 2 content</p>");
    expect(result).not.toContain("page-node");
    expect(result).not.toContain("page-body");
  });

  it("strips .page-header and .page-footer as well", () => {
    const html = `
      <div class="page-node">
        <div class="page-header">Header</div>
        <div class="page-body"><p>Body</p></div>
        <div class="page-footer">Footer</div>
      </div>
    `;
    const result = stripPaginationWrappers(html);
    expect(result).toContain("Header");
    expect(result).toContain("<p>Body</p>");
    expect(result).toContain("Footer");
    expect(result).not.toContain("page-header");
    expect(result).not.toContain("page-footer");
    expect(result).not.toContain("page-node");
  });

  it("preserves siblings outside wrappers", () => {
    const html = `
      <p>Before</p>
      <div class="page-node"><div class="page-body"><p>Inside</p></div></div>
      <p>After</p>
    `;
    const result = stripPaginationWrappers(html);
    expect(result).toContain("<p>Before</p>");
    expect(result).toContain("<p>Inside</p>");
    expect(result).toContain("<p>After</p>");
  });

  it("returns empty string for empty input", () => {
    expect(stripPaginationWrappers("")).toBe("");
  });

  it("handles deeply nested content inside wrappers", () => {
    const html = `
      <div class="page-node">
        <div class="page-body">
          <table>
            <tr><td>Cell 1</td><td>Cell 2</td></tr>
          </table>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      </div>
    `;
    const result = stripPaginationWrappers(html);
    expect(result).toContain("<table>");
    expect(result).toContain("<td>Cell 1</td>");
    expect(result).toContain("<li>Item 2</li>");
    expect(result).not.toContain("page-node");
    expect(result).not.toContain("page-body");
  });

  it("handles wrappers with no children gracefully", () => {
    const html = `<div class="page-node"></div>`;
    const result = stripPaginationWrappers(html);
    expect(result.trim()).toBe("");
  });

  it("re-joins adjacent soft-split paragraphs into one (across pages)", () => {
    const html =
      `<div class="page-node"><div class="page-body">` +
      `<p data-soft-split="true">Hello </p></div></div>` +
      `<div class="page-node"><div class="page-body">` +
      `<p data-soft-split="true">world</p></div></div>`;
    const out = stripPaginationWrappers(html);
    expect(out).not.toContain("data-soft-split");
    expect(out).toContain("Hello world");
    expect((out.match(/<p/g) || []).length).toBe(1);
  });

  it("does not merge normal (non-soft-split) paragraphs", () => {
    const html = `<p>A</p><p>B</p>`;
    expect((stripPaginationWrappers(html).match(/<p/g) || []).length).toBe(2);
  });

  it("merges three soft-split pieces but keeps a following normal paragraph", () => {
    const html =
      `<div class="page-body">` +
      `<p data-soft-split="true">one </p>` +
      `<p data-soft-split="true">two </p>` +
      `<p data-soft-split="true">three</p>` +
      `<p>separate</p></div>`;
    const out = stripPaginationWrappers(html);
    expect(out).toContain("one two three");
    expect(out).toContain("<p>separate</p>");
    expect((out.match(/<p/g) || []).length).toBe(2);
  });
});
