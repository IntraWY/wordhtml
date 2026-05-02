/**
 * Types for the Template Studio / mail-merge feature.
 *
 * NOTE: These are *data-driven templates* (variables + data rows),
 * distinct from the existing "document templates" in templateStore.ts
 * which are just saved HTML snapshots.
 */

/** A template variable such as {{customer_name}} */
export interface TemplateVariable {
  name: string;
  value: string;
  isList: boolean;
  delimiter?: string; // ',' or '|' or '\n'
  listValues?: string[]; // parsed array when isList === true
}

/** A data set imported from Google Sheets / CSV paste */
export interface DataSet {
  headers: string[];
  rows: Record<string, string>[];
  currentRowIndex: number;
}

/** State for template mode */
export interface TemplateModeState {
  enabled: boolean;
  variables: TemplateVariable[];
  dataSet: DataSet | null;
  previewMode: "edit" | "preview";
}

/** Config attached to a table row via Tiptap attributes */
export interface RepeatingRowConfig {
  enabled: boolean;
  /** If set, this variable drives the repeat count */
  sourceVariable?: string;
}

/** Options when exporting GAS code */
export interface GASExportOptions {
  includeGenerateFunction: boolean;
  includeSheetIntegration: boolean;
  functionName: string;
}

/** Result of processing a template */
export interface ProcessedTemplate {
  html: string;
  warnings: string[];
}

/** Result of generating GAS code */
export interface GeneratedGAS {
  code: string;
  warnings: string[];
}

/** Parsed CSV / tab-delimited data */
export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
}
