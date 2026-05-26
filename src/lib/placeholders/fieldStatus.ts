import type { TemplateVariable } from "@/types";
import type { MergeFieldStatus, MergeFieldStatusEntry } from "./types";
import { extractMergeFieldNames } from "./mergeFields";
import { MERGE_FIELD_REGEX_SOURCE } from "./constants";

function hasVariableValue(v: TemplateVariable | undefined): boolean {
  if (!v) return false;
  if (v.isList) return Boolean(v.listValues && v.listValues.length > 0);
  return v.value !== undefined && v.value !== "";
}

function resolveStatus(
  name: string,
  variables: TemplateVariable[],
  dataRow: Record<string, string> | undefined,
  mode: "edit" | "preview"
): MergeFieldStatus {
  const dataValue = dataRow?.[name];
  if (dataValue !== undefined && dataValue !== "") return "filled";

  const variable = variables.find((v) => v.name === name);
  if (hasVariableValue(variable)) return "filled";

  if (mode === "preview") return "missing";
  return "empty";
}

export function getMergeFieldStatuses(
  documentHtml: string,
  variables: TemplateVariable[],
  dataRow?: Record<string, string>,
  mode: "edit" | "preview" = "edit"
): MergeFieldStatusEntry[] {
  const names = extractMergeFieldNames(documentHtml);
  const regex = new RegExp(MERGE_FIELD_REGEX_SOURCE, "g");

  return names.map((name) => {
    let index = -1;
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(documentHtml)) !== null) {
      if (match[1] === name) {
        index = match.index;
        break;
      }
    }
    if (index < 0 && typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(documentHtml, "text/html");
      const el = doc.querySelector(`[data-variable="${CSS.escape(name)}"]`);
      if (el) index = 0;
    }
    return {
      name,
      status: resolveStatus(name, variables, dataRow, mode),
      index,
    };
  });
}

export function countMissingFields(entries: MergeFieldStatusEntry[]): number {
  return entries.filter((e) => e.status === "missing").length;
}
