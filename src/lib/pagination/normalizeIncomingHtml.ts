/**
 * Normalize HTML arriving from paste / file open so it never carries the
 * editor's internal pagination structure. Unwraps page wrappers (keeping
 * inner content in order) and removes page-break separators.
 *
 * Without this, pasting content that already contains `.page-node` /
 * `.page-body` (e.g. copying within the editor or pasting a previous export)
 * nests page structure inside the document and produces empty "ghost" pages.
 *
 * Uses DOMParser, which works in both the browser and jsdom (tests).
 */
export function normalizeIncomingHtml(html: string): string {
  if (
    !html.includes("page-node") &&
    !html.includes("page-body") &&
    !html.includes("page-break")
  ) {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove page-break separators outright — they must not nest in content.
  doc.querySelectorAll(".page-break").forEach((el) => el.remove());

  // Unwrap structural wrappers repeatedly until none remain, preserving the
  // order of inner content. A while-loop handles nested wrappers safely.
  let wrappers = doc.querySelectorAll(
    ".page-node, .page-body, .page-header, .page-footer"
  );
  while (wrappers.length > 0) {
    wrappers.forEach((el) => {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    });
    wrappers = doc.querySelectorAll(
      ".page-node, .page-body, .page-header, .page-footer"
    );
  }

  return doc.body.innerHTML;
}
