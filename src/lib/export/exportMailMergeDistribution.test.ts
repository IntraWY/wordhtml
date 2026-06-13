import { describe, it, expect } from "vitest";
import {
  buildMailMergeDistributionDocuments,
  downloadMailMergeDistributionZip,
} from "./exportMailMergeDistribution";
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

const recipients = ["ผู้ว่าราชการจังหวัด", "ผู้อำนวยการกองคลัง"];

const html =
  `<div class="page-node"><div class="page-body">` +
  `<p>เรียน {{เรียน}}</p><p>ผู้รับ {{ผู้รับ}}</p><p>วงเงิน ({{วงเงิน|baht}})</p>` +
  `</div></div>`;

const emptyDataSet: DataSet = { headers: [], rows: [], currentRowIndex: 0 };

describe("buildMailMergeDistributionDocuments", () => {
  it("produces one document per (row × recipient) pair, row-major", () => {
    const docs = buildMailMergeDistributionDocuments({
      html,
      variables,
      dataSet,
      recipients,
      pageSetup,
    });
    expect(docs).toHaveLength(4);
    expect(docs.map((d) => [d.rowIndex, d.recipient])).toEqual([
      [0, "ผู้ว่าราชการจังหวัด"],
      [0, "ผู้อำนวยการกองคลัง"],
      [1, "ผู้ว่าราชการจังหวัด"],
      [1, "ผู้อำนวยการกองคลัง"],
    ]);
  });

  it("resolves the row's merge fields AND applies the recipient", () => {
    const docs = buildMailMergeDistributionDocuments({
      html,
      variables,
      dataSet,
      recipients,
      pageSetup,
    });

    // Row 1 × recipient 1: row vars (incl. |baht filter) + recipient
    expect(docs[0].html).toContain("นายสมชาย");
    expect(docs[0].html).toContain("หนึ่งพันห้าร้อยบาทถ้วน");
    expect(docs[0].html).toContain("ผู้ว่าราชการจังหวัด");
    expect(docs[0].html).not.toContain("ผู้อำนวยการกองคลัง");
    expect(docs[0].html).not.toContain("{{เรียน}}");
    expect(docs[0].html).not.toContain("{{ผู้รับ}}");

    // Row 2 × recipient 2
    expect(docs[3].html).toContain("นางสมหญิง");
    expect(docs[3].html).toContain("สองพันห้าร้อยบาทห้าสิบสตางค์");
    expect(docs[3].html).toContain("ผู้อำนวยการกองคลัง");
    expect(docs[3].html).not.toContain("นายสมชาย");
  });

  it("recipient overrides a same-named row column", () => {
    const docs = buildMailMergeDistributionDocuments({
      html: "<p>{{เรียน}}</p>",
      variables: [],
      dataSet: {
        headers: ["เรียน"],
        rows: [{ เรียน: "ค่าจากแถว" }],
        currentRowIndex: 0,
      },
      recipients: ["ผู้รับจริง"],
      pageSetup,
    });
    expect(docs).toHaveLength(1);
    expect(docs[0].html).toContain("ผู้รับจริง");
    expect(docs[0].html).not.toContain("ค่าจากแถว");
  });

  it("HTML-escapes a recipient containing dangerous characters", () => {
    const docs = buildMailMergeDistributionDocuments({
      html: "<p>{{เรียน}}</p>",
      variables: [],
      dataSet: { headers: [], rows: [{}], currentRowIndex: 0 },
      recipients: ['<script>alert("x")</script>'],
      pageSetup,
    });
    expect(docs[0].html).not.toContain('<script>alert("x")</script>');
    expect(docs[0].html).toContain("&lt;script&gt;");
  });

  it("strips pagination wrappers from each document", () => {
    const docs = buildMailMergeDistributionDocuments({
      html,
      variables,
      dataSet,
      recipients,
      pageSetup,
    });
    expect(docs[0].html).not.toContain("page-node");
    expect(docs[0].html).not.toContain("page-body");
  });

  it("sanitizes the merged document output (defense-in-depth)", () => {
    const docs = buildMailMergeDistributionDocuments({
      html:
        `<div class="page-node"><div class="page-body">` +
        `<p>{{เรียน}}</p><script>alert(1)</script>` +
        `<img src=x onerror="alert(2)">` +
        `</div></div>`,
      variables: [],
      dataSet: { headers: [], rows: [{}], currentRowIndex: 0 },
      recipients: ["Alice"],
      pageSetup,
    });
    expect(docs[0].html).not.toContain("<script>");
    expect(docs[0].html).not.toContain("onerror");
  });

  it("supports a custom distribution fieldName", () => {
    const docs = buildMailMergeDistributionDocuments({
      html: "<p>To {{to}}, amount {{วงเงิน}}</p>",
      variables,
      dataSet,
      recipients: ["Alice"],
      pageSetup,
      fieldName: "to",
    });
    expect(docs).toHaveLength(2);
    expect(docs[0].html).toContain("To Alice");
    expect(docs[0].html).toContain("1500");
    expect(docs[0].html).not.toContain("{{to}}");
  });

  it("encodes row + recipient in unique, sanitized filenames", () => {
    const docs = buildMailMergeDistributionDocuments({
      html,
      variables,
      dataSet,
      recipients: ["ผู้ว่า กทม.", "ผู้ว่า/เชียงใหม่"],
      pageSetup,
    });

    // Unique even when recipients sanitize similarly (numeric prefixes)
    const names = docs.map((d) => d.fileName);
    expect(new Set(names).size).toBe(docs.length);

    // Index prefixes encode both axes: {row}_{recipient}-
    expect(names[0].startsWith("001_01-")).toBe(true);
    expect(names[1].startsWith("001_02-")).toBe(true);
    expect(names[2].startsWith("002_01-")).toBe(true);
    expect(names[3].startsWith("002_02-")).toBe(true);

    // Sanitized like the standalone exporters: no spaces or slashes
    expect(names.every((n) => !/[ /\\]/.test(n))).toBe(true);
    expect(names.every((n) => n.endsWith(".html"))).toBe(true);
  });

  it("names files by a chosen column like buildMergedDocuments", () => {
    const docs = buildMailMergeDistributionDocuments({
      html,
      variables,
      dataSet,
      recipients: ["นายอาคม"],
      pageSetup,
      nameColumn: "ผู้รับ",
    });
    expect(docs[0].fileName).toContain("นายสมชาย");
    expect(docs[0].fileName).toContain("นายอาคม");
    expect(docs[0].fileName.startsWith("001-")).toBe(true);
  });

  it("normalizes recipients: trims, drops blanks, de-duplicates", () => {
    const docs = buildMailMergeDistributionDocuments({
      html,
      variables,
      dataSet,
      recipients: ["  Alice  ", "", "   ", "Bob", "Alice"],
      pageSetup,
    });
    // 2 rows × 2 unique recipients
    expect(docs).toHaveLength(4);
    expect(docs.slice(0, 2).map((d) => d.recipient)).toEqual(["Alice", "Bob"]);
  });

  it("returns empty array when there are no rows", () => {
    expect(
      buildMailMergeDistributionDocuments({
        html,
        variables,
        dataSet: emptyDataSet,
        recipients,
        pageSetup,
      })
    ).toEqual([]);
  });

  it("returns empty array when there are no recipients", () => {
    expect(
      buildMailMergeDistributionDocuments({
        html,
        variables,
        dataSet,
        recipients: [],
        pageSetup,
      })
    ).toEqual([]);
  });
});

describe("downloadMailMergeDistributionZip", () => {
  it("rejects when there is nothing to export", async () => {
    await expect(
      downloadMailMergeDistributionZip({
        html,
        variables,
        dataSet: emptyDataSet,
        recipients,
        pageSetup,
      })
    ).rejects.toThrow(/no data rows or recipients/);
  });
});
