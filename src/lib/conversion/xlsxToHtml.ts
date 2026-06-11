import type ExcelJS from "exceljs";
import type { ConvertResult, MammothMessage } from "./docxToHtml";

/**
 * Convert a .xlsx file to an HTML table in the browser using exceljs
 * (dynamically imported — it is a heavy dependency).
 *
 * Aimed at Excel-as-layout print forms (Thai official forms): preserves
 * merged cells (colspan/rowspan), column widths (data-colwidth for the
 * Tiptap table), bold text, horizontal alignment, and the bordered /
 * borderless distinction (`data-borders="none"`, matching the
 * tableCellBorder extension). Formulas convert to their cached results.
 * Embedded images and OLE objects are not imported (reported as warnings).
 */
export async function xlsxToHtml(file: File): Promise<ConvertResult> {
  const mod = await import("exceljs");
  const Excel = (mod.default ?? mod) as typeof ExcelJS;

  const workbook = new Excel.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const warnings: MammothMessage[] = [];
  const sheet = pickSheet(workbook);
  if (!sheet) {
    throw new Error("ไม่พบชีตที่มีข้อมูลในไฟล์ .xlsx");
  }
  if (workbook.worksheets.length > 1) {
    warnings.push({
      type: "warning",
      message: `ไฟล์มี ${workbook.worksheets.length} ชีต — นำเข้าเฉพาะชีต "${sheet.name}"`,
    });
  }
  if (sheet.getImages().length > 0) {
    warnings.push({
      type: "warning",
      message: "รูปภาพที่ฝังในชีตไม่ถูกนำเข้า — แทรกรูปใหม่ได้จากแท็บ แทรก (Insert)",
    });
  }

  const html = sheetToTableHtml(sheet);
  if (!html) {
    throw new Error("ชีตไม่มีเนื้อหาที่นำเข้าได้");
  }
  return { html, warnings };
}

/** The sheet with the most non-empty cells wins (forms are single-sheet anyway). */
function pickSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet | null {
  let best: ExcelJS.Worksheet | null = null;
  let bestCount = 0;
  for (const ws of workbook.worksheets) {
    let count = 0;
    ws.eachRow(() => {
      count += 1;
    });
    if (count > bestCount) {
      best = ws;
      bestCount = count;
    }
  }
  return best;
}

interface MergeSpan {
  colspan: number;
  rowspan: number;
}

function sheetToTableHtml(ws: ExcelJS.Worksheet): string {
  const { maxRow, maxCol } = usedExtent(ws);
  if (maxRow === 0 || maxCol === 0) return "";

  const { masters, covered } = parseMerges(ws, maxRow, maxCol);

  const rows: string[] = [];
  for (let r = 1; r <= maxRow; r++) {
    const cells: string[] = [];
    for (let c = 1; c <= maxCol; c++) {
      if (covered.has(`${r}:${c}`)) continue;
      const cell = ws.getRow(r).getCell(c);
      const span = masters.get(`${r}:${c}`);
      cells.push(renderCell(ws, cell, r, c, span));
    }
    rows.push(`<tr>${cells.join("")}</tr>`);
  }
  return `<table><tbody>${rows.join("")}</tbody></table>`;
}

/**
 * Used range = cells with text OR any border (empty bordered grid boxes are
 * meaningful in print forms) OR participation in a merge whose master counts.
 * Trims the trailing empty rows/columns Excel often reports in `dimension`.
 */
function usedExtent(ws: ExcelJS.Worksheet): { maxRow: number; maxCol: number } {
  let maxRow = 0;
  let maxCol = 0;
  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (cellText(cell.value) !== "" || hasAnyBorder(cell)) {
        if (rowNumber > maxRow) maxRow = rowNumber;
        if (colNumber > maxCol) maxCol = colNumber;
      }
    });
  });
  return { maxRow, maxCol };
}

function parseMerges(
  ws: ExcelJS.Worksheet,
  maxRow: number,
  maxCol: number
): { masters: Map<string, MergeSpan>; covered: Set<string> } {
  const masters = new Map<string, MergeSpan>();
  const covered = new Set<string>();
  const merges: string[] =
    (ws.model as unknown as { merges?: string[] }).merges ?? [];

  for (const range of merges) {
    const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range);
    if (!m) continue;
    const c1 = colToNumber(m[1]);
    const r1 = Number(m[2]);
    const c2 = Math.min(colToNumber(m[3]), maxCol);
    const r2 = Math.min(Number(m[4]), maxRow);
    if (r1 > maxRow || c1 > maxCol || r2 < r1 || c2 < c1) continue;

    masters.set(`${r1}:${c1}`, { colspan: c2 - c1 + 1, rowspan: r2 - r1 + 1 });
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r === r1 && c === c1) continue;
        covered.add(`${r}:${c}`);
      }
    }
  }
  return { masters, covered };
}

function colToNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
}

const DEFAULT_COL_WIDTH = 8.43;
/** Excel column width is in characters; ≈7px per char at default font. */
function colWidthPx(ws: ExcelJS.Worksheet, col: number): number {
  const width = ws.getColumn(col).width ?? DEFAULT_COL_WIDTH;
  return Math.round(width * 7);
}

function renderCell(
  ws: ExcelJS.Worksheet,
  cell: ExcelJS.Cell,
  row: number,
  col: number,
  span: MergeSpan | undefined
): string {
  const colspan = span?.colspan ?? 1;
  const rowspan = span?.rowspan ?? 1;

  const attrs: string[] = [];
  if (colspan > 1) attrs.push(`colspan="${colspan}"`);
  if (rowspan > 1) attrs.push(`rowspan="${rowspan}"`);

  // First row carries the column widths for the whole Tiptap table.
  if (row === 1) {
    const widths = Array.from({ length: colspan }, (_, i) =>
      colWidthPx(ws, col + i)
    );
    attrs.push(`data-colwidth="${widths.join(",")}"`);
  }

  if (!hasAnyBorder(cell)) {
    attrs.push(`data-borders="none"`, `style="border:none"`);
  }

  let text = escapeHtml(cellText(cell.value)).replace(/\n/g, "<br>");
  if (text && cell.font?.bold) text = `<strong>${text}</strong>`;

  const align = cell.alignment?.horizontal;
  const pStyle =
    align === "center" || align === "right" || align === "justify"
      ? ` style="text-align:${align}"`
      : "";

  const attrText = attrs.length ? ` ${attrs.join(" ")}` : "";
  return `<td${attrText}><p${pStyle}>${text}</p></td>`;
}

function hasAnyBorder(cell: ExcelJS.Cell): boolean {
  const b = cell.border;
  if (!b) return false;
  return Boolean(b.top?.style || b.bottom?.style || b.left?.style || b.right?.style);
}

/** Flatten any exceljs cell value (rich text, formula result, hyperlink, …) to plain text. */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) {
    return value.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText.map((rt) => rt.text).join("");
    }
    if ("hyperlink" in value) {
      return cellText((value as { text?: ExcelJS.CellValue }).text ?? "");
    }
    if ("formula" in value || "sharedFormula" in value) {
      return cellText((value as { result?: ExcelJS.CellValue }).result ?? "");
    }
    if ("error" in value) return "";
  }
  return String(value);
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
