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
export { MERGE_FIELD_REGEX, MERGE_FIELD_REGEX_SOURCE, PAGE_TOKEN_REGEX } from "./constants";

export {
  extractMergeFieldNames,
  replaceMergeFields,
  renderMissingPlaceholder,
  renderMissingPlain,
} from "./mergeFields";

export { replacePageTokens, listPageTokensIn, type PageTokenContext } from "./pageTokens";

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

export { PLACEHOLDER_KINDS, type PlaceholderKindId } from "./registry";

export { jumpToMergeField } from "./jumpToMergeField";

export { removeMergeFieldFromHtml } from "./removeMergeField";
