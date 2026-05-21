/**
 * Strip pagination wrappers (.page-node, .page-body, .page-header, .page-footer)
 * from exported HTML so the output looks like a normal document.
 *
 * Uses DOMParser so it works in both browser and jsdom test environments.
 */
export function stripPaginationWrappers(html: string): string {
  if (!html.includes("page-node") && !html.includes("page-body")) return html;

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

  return doc.body.innerHTML;
}
