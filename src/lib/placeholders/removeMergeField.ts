import { MERGE_FIELD_REGEX_SOURCE } from "./constants";

/**
 * Remove every occurrence of a merge field from HTML: variable badge spans
 * (`[data-variable]`) and plain `{{name}}` text tokens.
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

  const regex = new RegExp(MERGE_FIELD_REGEX_SOURCE, "g");
  result = result.replace(regex, (match, captured: string) =>
    captured === name ? "" : match
  );

  return result;
}
