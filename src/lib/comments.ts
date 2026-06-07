/**
 * Document comments — pure data model.
 *
 * A `DocComment` anchors a free-text note to a quoted span of the document.
 * This module owns the data shape and the immutable list operations; the
 * Tiptap mark and the comment UI are wired separately.
 *
 * Note: callers pass the current time (`now`) explicitly so this module stays
 * pure and deterministic — it never calls `Date.now()` itself.
 */

export interface DocComment {
  id: string; // stable, e.g. "c1"
  text: string; // the comment body
  quote: string; // the text span the comment is anchored to
  resolved: boolean;
  createdAt: number; // epoch ms (passed in by caller — never Date.now here)
}

/**
 * Returns the next free id of the form `c<N>` (c1, c2, …) not already used in
 * `existing`. Scans upward from c1 and returns the first id that is free, so
 * gaps are reused: existing [c1, c3] → "c2".
 */
export function makeCommentId(existing: DocComment[]): string {
  const used = new Set(existing.map((c) => c.id));
  let n = 1;
  while (used.has(`c${n}`)) {
    n += 1;
  }
  return `c${n}`;
}

/**
 * Builds a fresh `DocComment` with a unique id (via `makeCommentId`),
 * `resolved: false`, and `createdAt: now`. `text` and `quote` are trimmed.
 */
export function createComment(params: {
  text: string;
  quote: string;
  now: number;
  existing: DocComment[];
}): DocComment {
  return {
    id: makeCommentId(params.existing),
    text: params.text.trim(),
    quote: params.quote.trim(),
    resolved: false,
    createdAt: params.now,
  };
}

/**
 * Returns a new array with `comment` added, or replacing the existing entry
 * with the same id. Order is preserved on replace; new entries append.
 */
export function upsertComment(
  list: DocComment[],
  comment: DocComment,
): DocComment[] {
  const idx = list.findIndex((c) => c.id === comment.id);
  if (idx === -1) {
    return [...list, comment];
  }
  const next = list.slice();
  next[idx] = comment;
  return next;
}

/** Returns a new array without the comment matching `id`. */
export function removeComment(list: DocComment[], id: string): DocComment[] {
  return list.filter((c) => c.id !== id);
}

/** Returns a new array with `resolved` flipped for the comment matching `id`. */
export function toggleResolved(list: DocComment[], id: string): DocComment[] {
  return list.map((c) =>
    c.id === id ? { ...c, resolved: !c.resolved } : c,
  );
}

/** Serializes the comment list to JSON. */
export function serializeComments(list: DocComment[]): string {
  return JSON.stringify(list);
}

function isValidComment(value: unknown): value is DocComment {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const c = value as Record<string, unknown>;
  return typeof c.id === "string" && typeof c.text === "string";
}

/**
 * Safe parse: returns [] on null/undefined, invalid JSON, or a non-array
 * payload. Filters entries down to those with a string `id` and `text`.
 */
export function parseComments(json: string | null | undefined): DocComment[] {
  if (json == null) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isValidComment);
}
