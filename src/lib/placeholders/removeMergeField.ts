import {
  FILTERED_MERGE_FIELD_REGEX_SOURCE,
  MERGE_FIELD_REGEX_SOURCE,
} from "./constants";

/**
 * Remove every occurrence of a merge field from HTML: variable badge spans
 * (`[data-variable]`), plain `{{name}}` text tokens, and filtered tokens
 * (`{{name|baht}}`, `{{name|currency}}`, `{{name|percent}}`, `{{name|comma}}`,
 * `{{name|thai}}`, `{{name|date}}`, `{{name|upper}}`, `{{name|lower}}`).
 *
 * Filtered tokens must be removed too — `extractMergeFieldNames` detects them,
 * so leaving one behind makes the variable reappear in the panel via auto-detect.
 */
export function removeMergeFieldFromHtml(html: string, name: string): string {
  let result = html;

  if (html.includes("data-variable")) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll(`[data-variable="${CSS.escape(name)}"]`).forEach((el) => {
      el.remove();
    });
    result = doc.body.innerHTML;
  }

  const dropIfNamed = (match: string, captured: string) =>
    captured === name ? "" : match;

  const filteredRegex = new RegExp(FILTERED_MERGE_FIELD_REGEX_SOURCE, "g");
  result = result.replace(filteredRegex, dropIfNamed);

  const regex = new RegExp(MERGE_FIELD_REGEX_SOURCE, "g");
  result = result.replace(regex, dropIfNamed);

  return result;
}
