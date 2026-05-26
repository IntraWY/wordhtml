import type { PlaceholderContext } from "./types";
import { replaceMergeFields } from "./mergeFields";
import { replacePageTokens } from "./pageTokens";

/**
 * Resolve merge fields and optional page tokens in HTML for preview/export.
 */
export function resolveHtmlPlaceholders(
  html: string,
  context: PlaceholderContext
): string {
  const {
    mode,
    variables,
    dataRow = {},
    pageNumber = 1,
    totalPages = 1,
    locale = "th-TH",
    missingPolicy,
  } = context;

  let out = replaceMergeFields(html, variables, dataRow, { mode, missingPolicy });

  if (mode !== "edit") {
    out = replacePageTokens(out, { pageNumber, totalPages, locale });
  }

  return out;
}
