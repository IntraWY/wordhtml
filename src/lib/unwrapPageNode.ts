/**
 * Extract the editable content of a single-page document for storage/export.
 *
 * For a single `.page-node`, returns the page body's inner HTML. If the page
 * has an editable header and/or footer node (`div[data-page-header]` /
 * `div[data-page-footer]`), those siblings are preserved verbatim so the
 * round-trip through {@link wrapInPageNode} (re-parsed by PageHeaderNode /
 * PageFooterNode) survives a store→reload→wrap cycle. Without this, a
 * single-page document silently loses its header/footer on every save.
 *
 * Multi-page HTML (or HTML without a page-node) is returned unchanged — those
 * keep their full `.page-node` wrappers and are normalized elsewhere.
 */
export function unwrapPageNode(html: string): string {
  if (!html.includes('class="page-node"')) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes = doc.querySelectorAll(".page-node");
  if (nodes.length !== 1) return html;

  const page = nodes[0];
  const body = page.querySelector(".page-body");
  if (!body) return html;

  const header = page.querySelector(":scope > .page-header[data-page-header]");
  const footer = page.querySelector(":scope > .page-footer[data-page-footer]");

  // No editable header/footer: keep the original body-only behaviour so plain
  // documents serialize to bare block HTML (what cleaners/exports expect).
  if (!header && !footer) return body.innerHTML;

  return (
    (header ? header.outerHTML : "") +
    body.innerHTML +
    (footer ? footer.outerHTML : "")
  );
}
