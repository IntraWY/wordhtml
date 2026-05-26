import type { HeaderFooterConfig, TemplateVariable } from "@/types";

export type PlaceholderResolveMode = "edit" | "preview" | "export" | "print";

export type MergeFieldStatus = "empty" | "filled" | "missing" | "invalid";

export type ExportMissingPolicy = "bracket" | "blank";

export interface PlaceholderContext {
  mode: PlaceholderResolveMode;
  pageNumber?: number;
  totalPages?: number;
  variables: TemplateVariable[];
  dataRow?: Record<string, string>;
  headerFooter?: HeaderFooterConfig;
  locale?: string;
  missingPolicy?: ExportMissingPolicy;
}

export interface EmptyStateHintAction {
  id: string;
  label: string;
  /** Custom event name or store action key */
  action: "open-file" | "preview" | "variables" | "warnings";
}

export interface EmptyStateConfig {
  variant: "default" | "template" | "template-preview" | "warnings";
  tiptapPlaceholder: string;
  srOnlyDescription: string;
  showEmptyHint: boolean;
  hintTitle?: string;
  hintSubtitle?: string;
  actions?: EmptyStateHintAction[];
}

export interface MergeFieldStatusEntry {
  name: string;
  status: MergeFieldStatus;
  /** First index in documentHtml for jump */
  index: number;
}
