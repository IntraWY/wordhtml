import type { TemplateVariable } from "@/types";
import type { ExportMissingPolicy } from "./types";
import { escapeHtml } from "./escapeHtml";
import {
  MERGE_FIELD_REGEX_SOURCE,
  FILTERED_MERGE_FIELD_REGEX_SOURCE,
} from "./constants";
import { bahtText, toThaiDigits, formatThaiDate } from "@/lib/thai";

/** Apply a merge-field filter to a resolved string value. */
function applyMergeFilter(value: string, filter: string): string {
  switch (filter) {
    case "baht":
      return bahtText(value);
    case "thai":
      return toThaiDigits(value);
    case "date": {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? value : formatThaiDate(d);
    }
    default:
      return value;
  }
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
    dataRow[name] ?? variables.find((v) => v.name === name)?.value;

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
