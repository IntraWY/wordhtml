import { describe, it, expect } from "vitest";
import { buildMergedDocuments } from "./exportMailMerge";
import type { TemplateVariable, DataSet, PageSetup } from "@/types";

const pageSetup: PageSetup = {
  size: "A4",
  orientation: "portrait",
  marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
};

const variables: TemplateVariable[] = [
  { name: "ผู้รับ", value: "", isList: false },
  { name: "วงเงิน", value: "", isList: false },
];

const dataSet: DataSet = {
  headers: ["ผู้รับ", "วงเงิน"],
  rows: [
    { ผู้รับ: "นายสมชาย", วงเงิน: "1500" },
    { ผู้รับ: "นางสมหญิง", วงเงิน: "2500.50" },
  ],
  currentRowIndex: 0,
};

const html =
  `<div class="page-node"><div class="page-body">` +
  `<p>เรียน {{ผู้รับ}}</p><p>วงเงิน ({{วงเงิน|baht}})</p>` +
  `</div></div>`;

describe("buildMergedDocuments", () => {
  it("produces one document per data row", () => {
    const docs = buildMergedDocuments({ html, variables, dataSet, pageSetup });
    expect(docs).toHaveLength(2);
  });

  it("resolves merge fields and filters per row", () => {
    const docs = buildMergedDocuments({ html, variables, dataSet, pageSetup });
    expect(docs[0].html).toContain("นายสมชาย");
    expect(docs[0].html).toContain("หนึ่งพันห้าร้อยบาทถ้วน");
    expect(docs[1].html).toContain("นางสมหญิง");
    expect(docs[1].html).toContain("สองพันห้าร้อยบาทห้าสิบสตางค์");
  });

  it("strips pagination wrappers from each document", () => {
    const docs = buildMergedDocuments({ html, variables, dataSet, pageSetup });
    expect(docs[0].html).not.toContain("page-node");
    expect(docs[0].html).not.toContain("page-body");
  });

  it("names files by a chosen column, falling back to row index", () => {
    const docs = buildMergedDocuments({
      html,
      variables,
      dataSet,
      pageSetup,
      nameColumn: "ผู้รับ",
    });
    expect(docs[0].fileName).toContain("นายสมชาย");
    expect(docs[0].fileName.endsWith(".html")).toBe(true);

    const indexed = buildMergedDocuments({ html, variables, dataSet, pageSetup });
    expect(indexed[0].fileName).toBe("001.html");
    expect(indexed[1].fileName).toBe("002.html");
  });

  it("returns empty array when there are no rows", () => {
    const empty: DataSet = { headers: [], rows: [], currentRowIndex: 0 };
    expect(
      buildMergedDocuments({ html, variables, dataSet: empty, pageSetup })
    ).toEqual([]);
  });

  it("sanitizes the merged document output (defense-in-depth)", () => {
    const evilHtml =
      `<div class="page-node"><div class="page-body">` +
      `<p>เรียน {{ผู้รับ}}</p><script>alert(1)</script>` +
      `<img src=x onerror="alert(2)">` +
      `</div></div>`;
    const docs = buildMergedDocuments({
      html: evilHtml,
      variables,
      dataSet,
      pageSetup,
    });
    expect(docs[0].html).not.toContain("<script>");
    expect(docs[0].html).not.toContain("onerror");
  });
});
