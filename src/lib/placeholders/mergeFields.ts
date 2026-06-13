import type { TemplateVariable } from "@/types";
import type { ExportMissingPolicy } from "./types";
import { escapeHtml } from "./escapeHtml";
import {
  MERGE_FIELD_REGEX_SOURCE,
  FILTERED_MERGE_FIELD_REGEX_SOURCE,
  NUMERIC_MERGE_FIELD_FILTERS,
} from "./constants";
import { bahtText, toThaiDigits, formatThaiDate } from "@/lib/thai";

const THAI_DIGIT_REGEX = /[๐-๙]/g; // ๐-๙

/**
 * Parse a merge-field value as a number. Accepts Arabic and Thai numerals,
 * thousands commas, and surrounding whitespace. Returns null when the value
 * is not numeric.
 */
export function parseNumericValue(value: string): number | null {
  const normalized = value
    .replace(THAI_DIGIT_REGEX, (d) => String(d.charCodeAt(0) - 0x0e50))
    .replace(/,/g, "")
    .trim();
  if (normalized === "") return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function isNumericFilter(filter: string): boolean {
  return (NUMERIC_MERGE_FIELD_FILTERS as readonly string[]).includes(filter);
}

/**
 * Own-property string lookup. Returns undefined for inherited prototype keys
 * (`__proto__`, `constructor`, `toString`, `valueOf`, `hasOwnProperty`, …) and
 * for non-string values, so a variable name colliding with a prototype member
 * can never yield an object/function that later throws on `.trim()` /
 * `escapeHtml` and aborts the whole export.
 */
function ownStringValue(
  obj: Record<string, string>,
  name: string
): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(obj, name)) return undefined;
  const value = obj[name];
  return typeof value === "string" ? value : undefined;
}

/**
 * Apply a merge-field filter to a resolved string value.
 *
 * Type-mismatch behavior (GAP 01): numeric filters (baht/currency/percent/
 * comma) with a non-numeric value return the ORIGINAL value unchanged —
 * never an empty string. Use `validateMergeFilters` to detect mismatches.
 */
export function applyMergeFilter(value: string, filter: string): string {
  if (isNumericFilter(filter)) {
    const n = parseNumericValue(value);
    if (n === null) return value; // non-numeric → keep original, never empty
    switch (filter) {
      case "baht":
        return bahtText(n);
      case "currency":
        return n.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      case "percent":
        return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
      case "comma":
        return n.toLocaleString("en-US", { maximumFractionDigits: 10 });
    }
  }
  switch (filter) {
    case "thai":
      return toThaiDigits(value);
    case "date": {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? value : formatThaiDate(d);
    }
    case "upper":
      return value.toLocaleUpperCase();
    case "lower":
      return value.toLocaleLowerCase();
    default:
      return value;
  }
}

/** A {{field|filter}} whose resolved value doesn't match the filter's expected type. */
export interface MergeFilterMismatch {
  field: string;
  filter: string;
  value: string;
  reason: string;
}

/**
 * Pure detection helper for GAP 01: scan HTML for {{field|filter}} tokens and
 * report every field whose resolved value (dataRow first, then variable
 * default) doesn't match the filter's expected type. Empty/missing values are
 * skipped — those are covered by the missing-field checks.
 */
export function validateMergeFilters(
  html: string,
  variables: TemplateVariable[],
  dataRow: Record<string, string> = {}
): MergeFilterMismatch[] {
  const mismatches: MergeFilterMismatch[] = [];
  const seen = new Set<string>();

  const filtered = new RegExp(FILTERED_MERGE_FIELD_REGEX_SOURCE, "g");
  let match: RegExpExecArray | null;
  while ((match = filtered.exec(html)) !== null) {
    const [, field, filter] = match;
    const key = `${field}|${filter}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const value =
      ownStringValue(dataRow, field) ??
      variables.find((v) => v.name === field)?.value;
    if (value === undefined || value === null || value.trim() === "") continue;

    if (isNumericFilter(filter) && parseNumericValue(value) === null) {
      mismatches.push({
        field,
        filter,
        value,
        reason: "ค่าไม่ใช่ตัวเลข (value is not numeric)",
      });
    } else if (filter === "date" && Number.isNaN(new Date(value).getTime())) {
      mismatches.push({
        field,
        filter,
        value,
        reason: "ค่าไม่ใช่วันที่ที่อ่านได้ (value is not a valid date)",
      });
    }
  }

  return mismatches;
}

export function extractMergeFieldNames(html: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  const add = (name: string | null | undefined) => {
    const trimmed = name?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    results.push(trimmed);
  };

  // Filtered fields ({{name|baht}}) first so the bare-name pass below doesn't
  // mis-read them; both contribute the underlying variable name.
  const filtered = new RegExp(FILTERED_MERGE_FIELD_REGEX_SOURCE, "g");
  let fMatch: RegExpExecArray | null;
  while ((fMatch = filtered.exec(html)) !== null) {
    add(fMatch[1]);
  }

  const regex = new RegExp(MERGE_FIELD_REGEX_SOURCE, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    add(match[1]);
  }

  if (html.includes("data-variable") || html.includes("variable-badge")) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("[data-variable]").forEach((el) => {
      add(el.getAttribute("data-variable"));
    });
  }

  return results;
}

export function renderMissingPlaceholder(name: string): string {
  return `<span class="placeholder-missing" data-placeholder-missing="${escapeHtml(name)}">[${escapeHtml(name)}]</span>`;
}

export function renderMissingPlain(name: string, policy: ExportMissingPolicy): string {
  if (policy === "blank") return "";
  return `[${name}]`;
}

/**
 * Replace {{variableName}} with values from dataRow / variable defaults.
 * In preview mode, missing values use .placeholder-missing spans.
 */
export function replaceMergeFields(
  html: string,
  variables: TemplateVariable[],
  dataRow: Record<string, string>,
  options?: { mode?: "edit" | "preview" | "export" | "print"; missingPolicy?: ExportMissingPolicy }
): string {
  const mode = options?.mode ?? "preview";
  const missingPolicy = options?.missingPolicy ?? "bracket";

  const resolveValue = (name: string): string | undefined =>
    ownStringValue(dataRow, name) ??
    variables.find((v) => v.name === name)?.value;

  const renderMissing = (name: string): string =>
    mode === "export" || mode === "print"
      ? escapeHtml(renderMissingPlain(name, missingPolicy))
      : renderMissingPlaceholder(name);

  // Pass 1: filtered fields {{name|filter}}.
  const filtered = new RegExp(FILTERED_MERGE_FIELD_REGEX_SOURCE, "g");
  let out = html.replace(filtered, (_m, name: string, filter: string) => {
    if (mode === "edit") return `{{${name}|${filter}}}`;
    const value = resolveValue(name);
    if (value === undefined || value === null || value === "") {
      return renderMissing(name);
    }
    return escapeHtml(applyMergeFilter(value, filter));
  });

  // Pass 2: plain fields {{name}}.
  const regex = new RegExp(MERGE_FIELD_REGEX_SOURCE, "g");
  out = out.replace(regex, (_match, name: string) => {
    if (mode === "edit") return `{{${name}}}`;

    const value = resolveValue(name);
    if (value === undefined || value === null || value === "") {
      return renderMissing(name);
    }
    return escapeHtml(value);
  });

  return out;
}
