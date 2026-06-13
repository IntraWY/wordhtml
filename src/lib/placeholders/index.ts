export type {
  PlaceholderContext,
  PlaceholderResolveMode,
  MergeFieldStatus,
  MergeFieldStatusEntry,
  EmptyStateConfig,
  EmptyStateHintAction,
  ExportMissingPolicy,
} from "./types";

export { escapeHtml } from "./escapeHtml";
export {
  MERGE_FIELD_REGEX,
  MERGE_FIELD_REGEX_SOURCE,
  FILTERED_MERGE_FIELD_REGEX_SOURCE,
  MERGE_FIELD_FILTERS,
  NUMERIC_MERGE_FIELD_FILTERS,
  MERGE_FIELD_FILTER_LABELS,
  PAGE_TOKEN_REGEX,
  type MergeFieldFilter,
} from "./constants";

export {
  extractMergeFieldNames,
  replaceMergeFields,
  renderMissingPlaceholder,
  renderMissingPlain,
  applyMergeFilter,
  parseNumericValue,
  validateMergeFilters,
  type MergeFilterMismatch,
} from "./mergeFields";

export {
  replacePageTokens,
  listPageTokensIn,
  PAGE_TOKEN_HELP,
  type PageTokenContext,
} from "./pageTokens";

export {
  getMergeFieldStatuses,
  countMissingFields,
} from "./fieldStatus";

export {
  getEmptyStateConfig,
  isDocumentEmpty,
  type EmptyStateInput,
} from "./emptyState";

export { resolveHtmlPlaceholders } from "./resolve";

export {
  resolveControlBlocks,
  stripControlBlocksForHealth,
} from "./conditionalBlocks";

export { PLACEHOLDER_KINDS, type PlaceholderKindId } from "./registry";

export { jumpToMergeField } from "./jumpToMergeField";

export { removeMergeFieldFromHtml } from "./removeMergeField";
