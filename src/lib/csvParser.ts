import type { ParsedCSV } from "@/types/template";

/**
 * Detect the most likely delimiter in a text sample.
 * Priority: tab > comma > pipe
 * Ignores delimiters inside quoted strings.
 */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return ",";

  const sample = lines.slice(0, 5).join("\n");
  const stripped = stripQuotedSections(sample);

  const tabCount = (stripped.match(/\t/g) || []).length;
  const commaCount = (stripped.match(/,/g) || []).length;
  const pipeCount = (stripped.match(/\|/g) || []).length;

  if (tabCount > 0 && tabCount >= commaCount && tabCount >= pipeCount) return "\t";
  if (commaCount > 0 && commaCount >= pipeCount) return ",";
  if (pipeCount > 0) return "|";
  return ",";
}

/** Remove quoted sections from text so delimiters inside quotes are not counted. */
function stripQuotedSections(text: string): string {
  return text.replace(/"[^"]*"/g, "");
}

/**
 * Parse CSV / tab-delimited / pipe-delimited text.
 * First row is treated as headers.
 * Handles multiline quoted fields and preserves spaces inside quotes.
 */
export function parseCSV(text: string, delimiter?: string): ParsedCSV {
  const delim = delimiter || detectDelimiter(text);
  const lines = splitRespectingQuotes(text);

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
 * Split text into lines, but respect quoted fields that may span multiple lines.
 */
function splitRespectingQuotes(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (!inQuotes && char === "\r" && next === "\n") {
      // CRLF — skip the \r, let the \n handle it on next iteration
      continue;
    }

    if (!inQuotes && char === "\n") {
      lines.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || lines.length > 0) {
    lines.push(current);
  }

  // Trim each line but preserve empty rows as empty strings
  return lines.map((l) => l.trim());
}

/**
 * Split a line respecting quoted values.
 * Simple implementation: does not handle escaped quotes inside quoted fields.
 * Preserves spaces inside quoted fields.
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
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
}
