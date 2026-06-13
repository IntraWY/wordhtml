/** One fill-in field found in the document HTML (GAP 02). */
export interface PlaceholderFieldInfo {
  /** data-field-id — may be "" for legacy/hand-written markup. */
  fieldId: string;
  label: string;
  fieldType: string;
  required: boolean;
  /** Value stored in the document node (data-value). */
  value: string;
}

/**
 * List the fill-in fields present in the document HTML, in document order.
 * Duplicate field ids (e.g. copy-pasted nodes) are reported once — they share
 * one entry in `fieldValues`, so one form input drives all occurrences.
 */
export function listPlaceholderFields(html: string): PlaceholderFieldInfo[] {
  if (!html.includes("data-placeholder-field")) return [];

  const doc = new DOMParser().parseFromString(html, "text/html");
  const seen = new Set<string>();
  const fields: PlaceholderFieldInfo[] = [];
  doc.querySelectorAll('[data-placeholder-field="true"]').forEach((el) => {
    const fieldId = el.getAttribute("data-field-id") ?? "";
    if (fieldId) {
      if (seen.has(fieldId)) return;
      seen.add(fieldId);
    }
    fields.push({
      fieldId,
      label: el.getAttribute("data-label") ?? "ช่องกรอก",
      fieldType: el.getAttribute("data-field-type") ?? "text",
      required: el.getAttribute("data-required") === "true",
      value: el.getAttribute("data-value") ?? "",
    });
  });
  return fields;
}

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
