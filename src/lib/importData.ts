import type { DataSet, VariableType } from "@/types";
import { parseCSV } from "./csvParser";

/**
 * Parse an Excel file (.xlsx) into a DataSet.
 * Uses dynamic import of the xlsx library to avoid bloating the initial bundle.
 */
export async function parseXlsx(file: File): Promise<DataSet> {
  const arrayBuffer = await file.arrayBuffer();
  const xlsx = await import("xlsx");
  const workbook = xlsx.read(arrayBuffer, { type: "array" });

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = xlsx.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];

  if (json.length === 0) {
    return { headers: [], rows: [], currentRowIndex: 0 };
  }

  const headers = (json[0] as unknown[]).map((h) => String(h ?? ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < json.length; i++) {
    const rowValues = json[i] as unknown[];
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const raw = rowValues[idx];
      row[h] = raw === undefined || raw === null ? "" : String(raw);
    });
    rows.push(row);
  }

  return { headers, rows, currentRowIndex: 0 };
}

/**
 * Parse CSV text into a DataSet.
 * Reuses the existing csvParser module.
 */
export function parseCsv(text: string): DataSet {
  const parsed = parseCSV(text);
  return {
    headers: parsed.headers,
    rows: parsed.rows,
    currentRowIndex: 0,
  };
}

/**
 * Infer the most likely VariableType from a string value.
 */
export function inferType(value: string): VariableType {
  if (!value || !value.trim()) return "text";
  const trimmed = value.trim();

  // Date patterns: ISO, Thai locale, common delimited
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ||
    /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}$/.test(trimmed)
  ) {
    return "date";
  }

  // Currency indicator first (symbols or words)
  if (/^[\$฿¥€£]/.test(trimmed) || /บาท|baht|usd/i.test(trimmed)) {
    return "currency";
  }

  // Number / percent
  const numeric = parseFloat(trimmed.replace(/[,$฿¥€£]/g, ""));
  if (!Number.isNaN(numeric)) {
    if (trimmed.endsWith("%")) return "percent";
    return "number";
  }

  return "text";
}

/**
 * Infer a default format string for a given VariableType based on sample values.
 */
export function inferFormat(
  type: VariableType,
  _samples: string[]
): string | undefined {
  switch (type) {
    case "currency":
      return "THB";
    case "date":
      return "short";
    case "number":
      return "decimal(2)";
    case "percent":
      return "0-100";
    default:
      return undefined;
  }
}

/**
 * Build a DataSet from raw headers + rows, with optional type inference per column.
 */
export function buildDataSet(
  headers: string[],
  rows: Record<string, string>[],
  options?: { inferTypes?: boolean }
): DataSet & { columnTypes?: Record<string, VariableType>; columnFormats?: Record<string, string> } {
  const result: DataSet & {
    columnTypes?: Record<string, VariableType>;
    columnFormats?: Record<string, string>;
  } = { headers, rows, currentRowIndex: 0 };

  if (options?.inferTypes && rows.length > 0) {
    const columnTypes: Record<string, VariableType> = {};
    const columnFormats: Record<string, string> = {};

    for (const header of headers) {
      // Collect non-empty samples for this column
      const samples = rows
        .map((r) => r[header])
        .filter((v) => v !== undefined && v.trim() !== "");

      if (samples.length > 0) {
        // Use the first sample for inference (simple heuristic)
        const type = inferType(samples[0]);
        columnTypes[header] = type;
        columnFormats[header] = inferFormat(type, samples);
      } else {
        columnTypes[header] = "text";
      }
    }

    result.columnTypes = columnTypes;
    result.columnFormats = columnFormats;
  }

  return result;
}
