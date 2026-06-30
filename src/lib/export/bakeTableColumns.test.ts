import { describe, it, expect } from "vitest";
import { bakeTableColumns } from "./bakeTableColumns";

const cell = (colwidth?: string, colspan = 1) =>
  `<td colspan="${colspan}" rowspan="1"${
    colwidth ? ` colwidth="${colwidth}"` : ""
  }><p>x</p></td>`;

describe("bakeTableColumns", () => {
  it("builds a colgroup and pins the table width when every column is known", () => {
    const html = `<table><tbody><tr>${cell("130")}${cell("90")}</tr></tbody></table>`;
    const out = bakeTableColumns(html);

    expect(out).toContain("<colgroup>");
    expect(out).toContain('<col style="width:130px">');
    expect(out).toContain('<col style="width:90px">');
    expect(out).toContain("width:220px"); // 130 + 90 pinned on <table>
    expect(out).not.toContain("colwidth"); // redundant attr stripped
  });

  it("leaves table width unpinned but emits cols when widths are partial", () => {
    const html = `<table><tbody><tr>${cell("130")}${cell()}</tr></tbody></table>`;
    const out = bakeTableColumns(html);

    expect(out).toContain('<col style="width:130px">');
    expect(out).toContain("<col>"); // unknown column → bare col
    // partial → do not pin a (wrong) total width on the table
    expect(out).not.toMatch(/<table[^>]*width:\d+px/);
  });

  it("expands a merged cell's comma-separated colwidth into per-column cols", () => {
    const html = `<table><tbody><tr>${cell("130,140", 2)}${cell("90")}</tr></tbody></table>`;
    const out = bakeTableColumns(html);

    expect(out).toContain('<col style="width:130px">');
    expect(out).toContain('<col style="width:140px">');
    expect(out).toContain('<col style="width:90px">');
    expect(out).toContain("width:360px"); // 130 + 140 + 90
  });

  it("leaves a table with no colwidth untouched (stays responsive)", () => {
    const html = `<table><tbody><tr>${cell()}${cell()}</tr></tbody></table>`;
    expect(bakeTableColumns(html)).toBe(html);
  });

  it("returns non-table HTML unchanged", () => {
    const html = "<p>just a paragraph</p>";
    expect(bakeTableColumns(html)).toBe(html);
  });

  it("is idempotent", () => {
    const html = `<table><tbody><tr>${cell("130")}${cell("90")}</tr></tbody></table>`;
    const once = bakeTableColumns(html);
    expect(bakeTableColumns(once)).toBe(once);
  });

  it("replaces a stale colgroup rather than duplicating it", () => {
    const html =
      `<table><colgroup><col style="width:10px"><col style="width:10px"></colgroup>` +
      `<tbody><tr>${cell("130")}${cell("90")}</tr></tbody></table>`;
    const out = bakeTableColumns(html);

    expect(out.match(/<colgroup>/g)?.length).toBe(1);
    expect(out).toContain('<col style="width:130px">');
    expect(out).not.toContain('width:10px');
  });

  it("bakes multiple tables independently", () => {
    const t1 = `<table><tbody><tr>${cell("100")}${cell("100")}</tr></tbody></table>`;
    const t2 = `<table><tbody><tr>${cell()}${cell()}</tr></tbody></table>`;
    const out = bakeTableColumns(t1 + t2);

    expect(out).toContain('<col style="width:100px">');
    expect(out).toContain("width:200px"); // first table pinned
    // second table (no widths) keeps no colgroup
    expect(out.match(/<colgroup>/g)?.length).toBe(1);
  });

  it("preserves other table inline styles when pinning width", () => {
    const html =
      `<table style="margin:1rem 0; width: 999px"><tbody><tr>${cell("60")}${cell("60")}</tr></tbody></table>`;
    const out = bakeTableColumns(html);

    expect(out).toContain("margin:1rem 0");
    expect(out).toContain("width:120px");
    expect(out).not.toContain("999px");
  });
});
