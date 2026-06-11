import type { TemplateVariable, DataSet } from "@/types";
import { extractMergeFieldNames } from "./mergeFields";

/**
 * JSON round-trip so variables are safe for Firestore (which rejects
 * `undefined` field values, e.g. an unset `delimiter`).
 */
export function compactVariables(variables: TemplateVariable[]): TemplateVariable[] {
  return JSON.parse(JSON.stringify(variables)) as TemplateVariable[];
}

/** Only the variables whose names appear as {{fields}} in the given HTML. */
export function variablesUsedIn(
  html: string,
  variables: TemplateVariable[]
): TemplateVariable[] {
  const names = new Set(extractMergeFieldNames(html));
  return variables.filter((v) => names.has(v.name));
}

/**
 * Merge variables restored from a template/snapshot into the current list:
 * incoming values fill empty slots and add missing names, but never clobber
 * a value the user already typed this session.
 */
export function mergeRestoredVariables(
  current: TemplateVariable[],
  incoming: TemplateVariable[]
): TemplateVariable[] {
  const byName = new Map(current.map((v) => [v.name, v]));
  const merged = current.map((v) => {
    const inc = incoming.find((i) => i.name === v.name);
    if (!inc) return v;
    return v.value?.trim() || (v.isList && v.listValues?.length) ? v : { ...inc };
  });
  for (const inc of incoming) {
    if (!byName.has(inc.name)) merged.push({ ...inc });
  }
  return merged;
}

/** localStorage budget for the mail-merge dataSet (history already caps at 4MB). */
export const DATASET_PERSIST_LIMIT = 200_000;

/** Persist the dataSet across reloads only while it stays reasonably small. */
export function shouldPersistDataSet(dataSet: DataSet | null): boolean {
  if (!dataSet) return false;
  try {
    return JSON.stringify(dataSet).length <= DATASET_PERSIST_LIMIT;
  } catch {
    return false;
  }
}
