import type { PlaceholderContext } from "./types";
import { replaceMergeFields } from "./mergeFields";
import { replacePageTokens } from "./pageTokens";
import { resolveControlBlocks } from "./conditionalBlocks";

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

  // Resolve conditional/loop control blocks BEFORE plain {{var}} substitution
  // (except in "edit" mode, which shows raw tokens) so that variables hidden
  // inside a false branch never reach the merge-field pass or health check.
  const withControlFlow =
    mode === "edit" ? html : resolveControlBlocks(html, variables, dataRow);

  let out = replaceMergeFields(withControlFlow, variables, dataRow, { mode, missingPolicy });

  if (mode !== "edit") {
    out = replacePageTokens(out, { pageNumber, totalPages, locale });
  }

  return out;
}
