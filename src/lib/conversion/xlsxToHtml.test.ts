import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { xlsxToHtml } from "./xlsxToHtml";

/**
 * Build an in-memory .xlsx File with exceljs (the same library the converter
 * uses) so tests exercise real workbook parsing, not mocks.
 */
async function buildXlsxFile(
  setup: (ws: ExcelJS.Worksheet, wb: ExcelJS.Workbook) => void
): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  setup(ws, wb);
  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], "test.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  bottom: { style: "thin" },
  left: { style: "thin" },
  right: { style: "thin" },
};

describe("xlsxToHtml", () => {
  it("converts cells into a table and trims trailing empty rows/cols", async () => {
    const file = await buildXlsxFile((ws) => {
      ws.getCell("A1").value = "หัวข้อ";
      ws.getCell("B2").value = "ข้อมูล";
      // Excel-style stray dimension: far-away cell that is truly empty
      ws.getCell("J20").value = null;
    });

    const { html } = await xlsxToHtml(file);
    expect(html).toContain("<table>");
    expect(html).toContain("หัวข้อ");
    expect(html).toContain("ข้อมูล");
    // 2 rows × 2 cols only
    expect(html.match(/<tr>/g)).toHaveLength(2);
    expect(html.match(/<td/g)).toHaveLength(4);
  });

  it("preserves merged cells as colspan/rowspan", async () => {
    const file = await buildXlsxFile((ws) => {
      ws.getCell("A1").value = "ผสานแนวนอน";
      ws.mergeCells("A1:C1");
      ws.getCell("A2").value = "x";
      ws.getCell("B2").value = "y";
      ws.getCell("C2").value = "z";
    });

    const { html } = await xlsxToHtml(file);
    expect(html).toContain('colspan="3"');
    // Covered cells are not emitted: row1 has 1 td, row2 has 3
    expect(html.match(/<td/g)).toHaveLength(4);
  });

  it("keeps empty bordered grid cells (form fill-in boxes)", async () => {
    const file = await buildXlsxFile((ws) => {
      ws.getCell("A1").value = "รายการ";
      ws.getCell("A1").border = thinBorder;
      ws.getCell("B1").border = thinBorder; // empty but bordered
      ws.getCell("A2").border = thinBorder; // empty bordered row below
      ws.getCell("B2").border = thinBorder;
    });

    const { html } = await xlsxToHtml(file);
    expect(html.match(/<tr>/g)).toHaveLength(2);
    expect(html.match(/<td/g)).toHaveLength(4);
    // Bordered cells must NOT be marked borderless
    expect(html).not.toContain('data-borders="none"');
  });

  it("marks unbordered cells with data-borders=none for the form look", async () => {
    const file = await buildXlsxFile((ws) => {
      ws.getCell("A1").value = "หัวจดหมาย ไม่มีเส้น";
      ws.getCell("A2").value = "ตาราง";
      ws.getCell("A2").border = thinBorder;
    });

    const { html } = await xlsxToHtml(file);
    expect(html).toContain('data-borders="none"');
    expect(html).toContain("border:none");
  });

  it("renders bold and alignment, and emits data-colwidth from column widths", async () => {
    const file = await buildXlsxFile((ws) => {
      ws.getColumn(1).width = 20;
      ws.getCell("A1").value = "หัวเรื่อง";
      ws.getCell("A1").font = { bold: true };
      ws.getCell("A1").alignment = { horizontal: "center" };
    });

    const { html } = await xlsxToHtml(file);
    expect(html).toContain("<strong>หัวเรื่อง</strong>");
    expect(html).toContain("text-align:center");
    expect(html).toContain(`data-colwidth="140"`); // 20 chars × 7px
  });

  it("flattens rich text and formula results to plain text", async () => {
    const file = await buildXlsxFile((ws) => {
      ws.getCell("A1").value = {
        richText: [{ text: "ส่วน" }, { text: "รวม", font: { bold: true } }],
      };
      ws.getCell("A2").value = { formula: "1+1", result: 2 };
    });

    const { html } = await xlsxToHtml(file);
    expect(html).toContain("ส่วนรวม");
    expect(html).toContain("<p>2</p>");
  });

  it("escapes HTML in cell values", async () => {
    const file = await buildXlsxFile((ws) => {
      ws.getCell("A1").value = '<img src=x onerror=alert(1)> & "quote"';
    });

    const { html } = await xlsxToHtml(file);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&amp;");
  });

  it("picks the sheet with content and warns about extra sheets", async () => {
    const file = await buildXlsxFile((ws, wb) => {
      // First sheet stays empty; second carries the form
      const ws2 = wb.addWorksheet("ฟอร์ม");
      ws2.getCell("A1").value = "เนื้อหาจริง";
    });

    const { html, warnings } = await xlsxToHtml(file);
    expect(html).toContain("เนื้อหาจริง");
    expect(warnings.some((w) => w.message.includes("ฟอร์ม"))).toBe(true);
  });

  it("throws on a workbook with no content", async () => {
    const file = await buildXlsxFile(() => undefined);
    await expect(xlsxToHtml(file)).rejects.toThrow();
  });
});
