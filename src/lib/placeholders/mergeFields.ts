import type { TemplateVariable } from "@/types";
import type { ExportMissingPolicy } from "./types";
import { escapeHtml } from "./escapeHtml";
import { MERGE_FIELD_REGEX_SOURCE } from "./constants";

export function extractMergeFieldNames(html: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  const add = (name: string | null | undefined) => {
    const trimmed = name?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    results.push(trimmed);
  };

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
  const regex = new RegExp(MERGE_FIELD_REGEX_SOURCE, "g");

  return html.replace(regex, (_match, name: string) => {
    if (mode === "edit") return `{{${name}}}`;

    const value = dataRow[name] ?? variables.find((v) => v.name === name)?.value;
    if (value === undefined || value === null || value === "") {
      if (mode === "export" || mode === "print") {
        return escapeHtml(renderMissingPlain(name, missingPolicy));
      }
      return renderMissingPlaceholder(name);
    }
    return escapeHtml(value);
  });
}
