import {
  removeInlineStyles,
  removeEmptyTags,
  collapseSpaces,
  removeAttributes,
  removeClassesAndIds,
  removeComments,
  unwrapSpans,
  plainText,
} from "./cleaners";

import type { CleanerKey } from "@/types";

type CleanerFn = (html: string) => string;

/**
 * Order matters: structural cleaners first, whitespace last, plainText terminal.
 *
 *  - removeComments cuts noise before structural passes work on it.
 *  - removeAttributes is a superset of inline-styles + classes/ids; if the user
 *    enabled it, those are redundant — but harmless.
 *  - unwrapSpans before removeEmptyTags, so emptied spans get re-evaluated.
 *  - removeEmptyTags after others — they may have produced new empties.
 *  - collapseSpaces last among structural passes.
 *  - plainText, when enabled, is terminal and overrides everything below it.
 */
const ORDER: ReadonlyArray<{ key: CleanerKey; fn: CleanerFn }> = [
  { key: "removeComments", fn: removeComments },
  { key: "removeInlineStyles", fn: removeInlineStyles },
  { key: "removeClassesAndIds", fn: removeClassesAndIds },
  { key: "removeAttributes", fn: removeAttributes },
  { key: "unwrapSpans", fn: unwrapSpans },
  { key: "removeEmptyTags", fn: removeEmptyTags },
  { key: "collapseSpaces", fn: collapseSpaces },
];

export function applyCleaners(
  html: string,
  enabled: ReadonlyArray<CleanerKey>
): string {
  if (!html) return "";
  const enabledSet = new Set(enabled);

  let out = html;
  for (const { key, fn } of ORDER) {
    if (enabledSet.has(key)) {
      out = fn(out);
    }
  }

  // plainText is terminal: it discards markup, so apply after everything else.
  if (enabledSet.has("plainText")) {
    out = plainText(out);
  }

  return out;
}
