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

  it("unwraps comment spans (B5) so comments never ship in exports", () => {
    const html = `<p>Hi <span class="wh-comment" data-comment-id="c1" data-comment-text="note">there</span>!</p>`;
    const out = stripPaginationWrappers(html);
    expect(out).toContain("Hi there!");
    expect(out).not.toContain("data-comment-id");
    expect(out).not.toContain("wh-comment");
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

  describe("A3 auto table-split re-join", () => {
    function countTags(html: string, tag: string): number {
      return (html.match(new RegExp(`<${tag}\\b`, "g")) || []).length;
    }

    it("re-joins two header-repeating table pieces into one table with one header", () => {
      // Piece 1: header + rows a,b. Piece 2: repeated header (marked) + rows c,d.
      const html =
        `<div class="page-node"><div class="page-body">` +
        `<table><tbody>` +
        `<tr><th>H1</th><th>H2</th></tr>` +
        `<tr><td>a1</td><td>a2</td></tr>` +
        `<tr><td>b1</td><td>b2</td></tr>` +
        `</tbody></table></div></div>` +
        `<div class="page-node"><div class="page-body">` +
        `<table><tbody>` +
        `<tr data-repeat-source="table-soft-split-header"><th>H1</th><th>H2</th></tr>` +
        `<tr><td>c1</td><td>c2</td></tr>` +
        `<tr><td>d1</td><td>d2</td></tr>` +
        `</tbody></table></div></div>`;
      const out = stripPaginationWrappers(html);
      // Exactly one table, no markers left.
      expect(countTags(out, "table")).toBe(1);
      expect(out).not.toContain("data-repeat-source");
      // Single header row (one <th> pair) — the repeated copy was dropped.
      expect(countTags(out, "th")).toBe(2);
      // All four content rows present, none duplicated.
      ["a1", "b1", "c1", "d1"].forEach((c) => expect(out).toContain(c));
      // 1 header + 4 content rows.
      expect(countTags(out, "tr")).toBe(5);
    });

    it("re-joins three pieces and keeps a following normal table separate", () => {
      const piece = (marker: boolean, rows: string[]) =>
        `<table><tbody>` +
        `<tr${marker ? ' data-repeat-source="table-soft-split-header"' : ""}><th>H</th></tr>` +
        rows.map((r) => `<tr><td>${r}</td></tr>`).join("") +
        `</tbody></table>`;
      const html =
        `<div class="page-body">` +
        piece(false, ["a"]) +
        piece(true, ["b"]) +
        piece(true, ["c"]) +
        `<table><tbody><tr><td>other</td></tr></tbody></table>` +
        `</div>`;
      const out = stripPaginationWrappers(html);
      // The 3 split pieces merge into 1; the standalone table stays -> 2 total.
      expect(countTags(out, "table")).toBe(2);
      expect(countTags(out, "th")).toBe(1); // single header in merged table
      ["a", "b", "c", "other"].forEach((c) => expect(out).toContain(c));
    });

    it("re-joins header-less pieces (data-repeat-source=table-soft-split) keeping the marked row", () => {
      const html =
        `<table><tbody>` +
        `<tr><td>r1</td></tr>` +
        `<tr><td>r2</td></tr>` +
        `</tbody></table>` +
        `<table><tbody>` +
        `<tr data-repeat-source="table-soft-split"><td>r3</td></tr>` +
        `<tr><td>r4</td></tr>` +
        `</tbody></table>`;
      const out = stripPaginationWrappers(html);
      expect(countTags(out, "table")).toBe(1);
      expect(out).not.toContain("data-repeat-source");
      // No header in this table; all 4 content rows kept (marked row NOT dropped).
      expect(countTags(out, "tr")).toBe(4);
      ["r1", "r2", "r3", "r4"].forEach((c) => expect(out).toContain(c));
    });

    it("leaves a single non-split table untouched", () => {
      const html = `<table><tbody><tr><th>H</th></tr><tr><td>x</td></tr></tbody></table>`;
      const out = stripPaginationWrappers(html);
      expect(countTags(out, "table")).toBe(1);
      expect(countTags(out, "tr")).toBe(2);
    });

    it("appends absorbed content rows into <tbody>, never <thead>, when target has only a <thead>", () => {
      // First piece keeps its header in a real <thead> (no <tbody>). The
      // continuation carries a repeated-header marker row + a content row.
      const html =
        `<table><thead><tr><th>H</th></tr></thead></table>` +
        `<table><tbody>` +
        `<tr data-repeat-source="table-soft-split-header"><th>H</th></tr>` +
        `<tr><td>x</td></tr>` +
        `</tbody></table>`;
      const out = stripPaginationWrappers(html);
      // Merged into one table, marker gone, exactly one header kept.
      expect(countTags(out, "table")).toBe(1);
      expect(out).not.toContain("data-repeat-source");
      expect(countTags(out, "th")).toBe(1);
      // The data row landed in <tbody>, NOT inside <thead>.
      const doc = new DOMParser().parseFromString(out, "text/html");
      const table = doc.querySelector("table")!;
      expect(table.tHead).not.toBeNull();
      expect(table.tHead!.querySelectorAll("tr").length).toBe(1); // header only
      expect(table.tHead!.textContent).not.toContain("x");
      expect(table.tBodies.length).toBe(1);
      const bodyRows = table.tBodies[0].querySelectorAll("tr");
      expect(bodyRows.length).toBe(1);
      expect(bodyRows[0].textContent).toContain("x");
      // Order preserved: header row before the content row in document order.
      const allRows = Array.from(table.querySelectorAll("tr"));
      expect(allRows[0].textContent).toContain("H");
      expect(allRows[1].textContent).toContain("x");
    });

    it("merges a <thead>+<tbody> continuation correctly (rows in order, header kept once)", () => {
      // First piece: <thead> header + <tbody> rows a,b.
      // Continuation: <thead> marked-header + <tbody> rows c,d.
      const html =
        `<table>` +
        `<thead><tr><th>H</th></tr></thead>` +
        `<tbody><tr><td>a</td></tr><tr><td>b</td></tr></tbody>` +
        `</table>` +
        `<table>` +
        `<thead><tr data-repeat-source="table-soft-split-header"><th>H</th></tr></thead>` +
        `<tbody><tr><td>c</td></tr><tr><td>d</td></tr></tbody>` +
        `</table>`;
      const out = stripPaginationWrappers(html);
      expect(countTags(out, "table")).toBe(1);
      expect(out).not.toContain("data-repeat-source");
      expect(countTags(out, "th")).toBe(1); // single header kept
      const doc = new DOMParser().parseFromString(out, "text/html");
      const table = doc.querySelector("table")!;
      // No data row leaked into the header.
      expect(table.tHead!.textContent).not.toMatch(/[abcd]/);
      // All four content rows present, in order, inside tbody.
      const bodyRows = Array.from(
        table.querySelectorAll("tbody tr")
      ).map((r) => r.textContent?.trim());
      expect(bodyRows).toEqual(["a", "b", "c", "d"]);
    });

    it("keeps two unrelated separate tables separate (no spurious merge)", () => {
      const html =
        `<table><tbody><tr><td>one</td></tr></tbody></table>` +
        `<table><tbody><tr><td>two</td></tr></tbody></table>`;
      const out = stripPaginationWrappers(html);
      // Neither table is a continuation piece → both stay independent.
      expect(countTags(out, "table")).toBe(2);
      expect(out).toContain("one");
      expect(out).toContain("two");
    });
  });
});
