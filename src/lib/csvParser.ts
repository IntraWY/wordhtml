import type { ParsedCSV } from "@/types/template";

/**
 * Detect the most likely delimiter in a text sample.
 * Priority: tab > comma > pipe
 */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return ",";

  const sample = lines.slice(0, 5).join("\n");

  const tabCount = (sample.match(/\t/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const pipeCount = (sample.match(/\|/g) || []).length;

  if (tabCount > 0 && tabCount >= commaCount && tabCount >= pipeCount) return "\t";
  if (commaCount > 0 && commaCount >= pipeCount) return ",";
  if (pipeCount > 0) return "|";
  return ",";
}

/**
 * Parse CSV / tab-delimited / pipe-delimited text.
 * First row is treated as headers.
 */
export function parseCSV(text: string, delimiter?: string): ParsedCSV {
  const delim = delimiter || detectDelimiter(text);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], delimiter: delim };
  }

  const headers = splitLine(lines[0], delim);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i], delim);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows, delimiter: delim };
}

/**
 * Split a line respecting quoted values.
 * Simple implementation: does not handle escaped quotes inside quoted fields.
 */
function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === "\t") return line.split("\t");

  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}
