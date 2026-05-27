/** Extract page-body HTML from a single-page document; multi-page HTML is unchanged. */
export function unwrapPageNode(html: string): string {
  if (!html.includes('class="page-node"')) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes = doc.querySelectorAll(".page-node");
  if (nodes.length !== 1) return html;

  const body = nodes[0].querySelector(".page-body");
  if (!body) return html;

  return body.innerHTML;
}
