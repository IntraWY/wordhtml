/**
 * Sanitize HTML by parsing it and removing dangerous elements/attributes.
 * Strips <script>, event handlers (on*), and javascript: URLs.
 */
export function sanitizeHtml(raw: string): string {
  if (!raw) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/html");

    // Remove <script> and <iframe> elements entirely
    const dangerousTags = ["script", "iframe", "object", "embed", "form"];
    dangerousTags.forEach((tag) => {
      doc.querySelectorAll(tag).forEach((el) => el.remove());
    });

    // Strip event handlers and dangerous attributes from all elements
    const allElements = doc.querySelectorAll("*");
    allElements.forEach((el) => {
      for (let i = el.attributes.length - 1; i >= 0; i--) {
        const attr = el.attributes[i];
        const name = attr.name.toLowerCase();
        const value = attr.value;
        if (
          name.startsWith("on") ||
          name === "action" ||
          (name === "href" && /^javascript:/i.test(value)) ||
          (name === "src" && /^javascript:/i.test(value))
        ) {
          el.removeAttribute(attr.name);
        }
      }
    });

    return doc.body.innerHTML;
  } catch {
    // Fallback: if DOMParser fails, return empty string to avoid security risk
    return "";
  }
}
