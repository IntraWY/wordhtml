import type { TemplateVariable } from "@/types";

/** Filter chips in the variable panel. */
export type PanelFilterMode = "all" | "inDocument" | "unfilled";

/** A variable counts as filled when it has a usable value (or list items). */
export function isVariableFilled(v: TemplateVariable): boolean {
  if (v.isList) return (v.listValues?.length ?? 0) > 0;
  return Boolean(v.value?.trim());
}

/**
 * Apply search query + filter chip to the panel's variable list.
 * `documentNames` = merge-field names currently present in the document
 * (from `extractMergeFieldNames`).
 */
export function filterPanelVariables(
  variables: TemplateVariable[],
  documentNames: ReadonlySet<string>,
  query: string,
  mode: PanelFilterMode
): TemplateVariable[] {
  const q = query.trim().toLowerCase();
  return variables.filter((v) => {
    if (q && !v.name.toLowerCase().includes(q)) return false;
    if (mode === "inDocument") return documentNames.has(v.name);
    if (mode === "unfilled") {
      return documentNames.has(v.name) && !isVariableFilled(v);
    }
    return true;
  });
}

/** Names in the panel that no longer appear anywhere in the document. */
export function staleVariableNames(
  variables: TemplateVariable[],
  documentNames: ReadonlySet<string>
): string[] {
  return variables.filter((v) => !documentNames.has(v.name)).map((v) => v.name);
}

/**
 * The next unfilled variable that is actually used in the document —
 * target for the "jump to next empty" button.
 */
export function nextEmptyVariableName(
  variables: TemplateVariable[],
  documentNames: ReadonlySet<string>
): string | null {
  const hit = variables.find(
    (v) => documentNames.has(v.name) && !isVariableFilled(v)
  );
  return hit?.name ?? null;
}
