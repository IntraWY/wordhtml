/**
 * Replace content-control spans with plain text for export.
 */
export function inlinePlaceholderFields(
  html: string,
  fieldValues: Record<string, string>
): string {
  if (!html.includes("data-placeholder-field")) return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll('[data-placeholder-field="true"]').forEach((el) => {
    const id = el.getAttribute("data-field-id") ?? "";
    const label = el.getAttribute("data-label") ?? "";
    const attrVal = el.getAttribute("data-value") ?? "";
    const stored = id ? fieldValues[id] : "";
    const text = (stored || attrVal || label).trim();
    el.replaceWith(doc.createTextNode(text));
  });
  return doc.body.innerHTML;
}
