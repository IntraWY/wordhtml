import { generateToc } from "@/lib/toc";

export interface CrossRefTarget {
  id: string;
  text: string;
  level: number;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * List heading targets available for cross-referencing.
 * Maps the TOC entries to {id, text, level} and drops any with an empty id.
 */
export function listCrossRefTargets(html: string): CrossRefTarget[] {
  return generateToc(html)
    .map(({ id, text, level }) => ({ id, text, level }))
    .filter((target) => target.id.trim() !== "");
}

/**
 * Build an internal anchor link to a heading target.
 * The label is HTML-escaped. A blank label falls back to the targetId.
 * If the targetId is blank, returns the escaped label as plain text (no link).
 */
export function buildCrossRefHtml(targetId: string, label: string): string {
  const safeLabel = escapeHtml(label.trim() !== "" ? label : targetId);
  if (targetId.trim() === "") {
    return safeLabel;
  }
  return `<a href="#${escapeHtml(targetId)}">${safeLabel}</a>`;
}

/**
 * Default Thai label for a cross-reference: ดูหัวข้อ "<text>" (see heading).
 */
export function defaultCrossRefLabel(target: CrossRefTarget): string {
  return `ดูหัวข้อ "${target.text}"`;
}
