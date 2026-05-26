/**
 * Central registry of placeholder kinds in wordhtml.
 * Implementation lives in sibling modules; this file documents IDs and entry points.
 */

export const PLACEHOLDER_KINDS = {
  empty: "empty.doc",
  mergeField: "field.*",
  pageToken: "page.*",
  missing: "missing.*",
  contentControl: "control.*",
  blockSlot: "slot.*",
} as const;

export type PlaceholderKindId =
  (typeof PLACEHOLDER_KINDS)[keyof typeof PLACEHOLDER_KINDS];
