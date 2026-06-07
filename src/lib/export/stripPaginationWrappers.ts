/**
 * Strip pagination wrappers (.page-node, .page-body, .page-header, .page-footer)
 * from exported HTML so the output looks like a normal document, and re-join
 * paragraphs that the paginator soft-split across pages (data-soft-split) back
 * into single paragraphs.
 *
 * Uses DOMParser so it works in both browser and jsdom test environments.
 */
export function stripPaginationWrappers(html: string): string {
  const hasWrappers =
    html.includes("page-node") || html.includes("page-body");
  const hasSoftSplit = html.includes("data-soft-split");
  if (!hasWrappers && !hasSoftSplit) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const wrappers = doc.querySelectorAll(
    ".page-node, .page-body, .page-header, .page-footer"
  );
  wrappers.forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  });

  mergeSoftSplitParagraphs(doc.body);

  return doc.body.innerHTML;
}

/** Merge runs of adjacent `<p data-soft-split="true">` into a single paragraph. */
function mergeSoftSplitParagraphs(root: HTMLElement): void {
  const pieces = Array.from(
    root.querySelectorAll('p[data-soft-split="true"]')
  );
  for (const piece of pieces) {
    // Skip pieces already absorbed into a previous run.
    if (!piece.parentNode) continue;

    let next = piece.nextElementSibling;
    while (
      next &&
      next.tagName === "P" &&
      next.getAttribute("data-soft-split") === "true"
    ) {
      while (next.firstChild) piece.appendChild(next.firstChild);
      const absorbed = next;
      next = next.nextElementSibling;
      absorbed.remove();
    }
    piece.removeAttribute("data-soft-split");
  }
}
