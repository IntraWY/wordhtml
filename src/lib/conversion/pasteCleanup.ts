/**
 * Strip Microsoft Office / Google Docs paste noise from HTML.
 *
 * Handles mso-* styles, Word-specific tags (<o:p>, <w:*>), conditional comments,
 * inline <style> blocks, and Office class names ("MsoNormal", etc.).
 *
 * Operates on raw HTML strings — safe to call before handing to Tiptap or to
 * the cleaning pipeline.
 */
export function cleanPastedHtml(input: string): string {
  if (!input) return "";

  // Guard against unbounded processing of extremely large inputs
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (input.length > MAX_SIZE) {
    input = input.slice(0, MAX_SIZE);
  }

  let html = input;

  // 1. Drop conditional comments using bounded string search
  html = removeConditionalComments(html);

  // 2. Drop entire <style> blocks using bounded string search
  html = removeStyleBlocks(html);

  // 3. Drop xmlns / Office namespace attributes on the root element
  html = html.replace(/\sxmlns(:\w+)?=["'][^"']*["']/gi, "");

  // 4. Drop <o:p>, <w:*>, <m:*>, <v:*> tags entirely (open + close + self-closing)
  html = html.replace(/<\/?(o|w|m|v):[^>]*>/gi, "");

  // 5. Strip Office class names
  html = html.replace(/\sclass=["'](?:Mso[\w-]*\s?)+["']/gi, "");

  // 6. Strip mso-* declarations from inline style attributes
  html = html.replace(/\sstyle=["']([^"']*)["']/gi, (_, styles: string) => {
    const cleaned = styles
      .split(";")
      .map((decl) => decl.trim())
      .filter((decl) => decl.length > 0 && !/^mso-/i.test(decl))
      .join("; ");
    return cleaned ? ` style="${cleaned}"` : "";
  });

  // 7. Strip lang="" / xml:lang="" attributes
  html = html.replace(/\s(?:xml:)?lang=["'][^"']*["']/gi, "");

  // 8. Collapse non-breaking spaces emitted as &nbsp; runs to single spaces
  //    (preserve single nbsp — sometimes intentional)
  html = html.replace(/(?:&nbsp;){2,}/g, "&nbsp;");

  // 9. Normalize structural wrappers — unwrap <div> containers and convert
  //    <br>-separated inline content into proper <p> paragraphs so that pastes
  //    from external sources (Word, web pages, plain-text editors) don't end
  //    up as a single oversized paragraph.
  html = normalizePastedStructure(html);

  return html;
}

/**
 * Normalize common paste structural patterns:
 * - Unwrap generic container tags (<div>, <section>, <article>, etc.) that
 *   wrap block-level children (e.g. <p>, <h1>…).
 * - Convert generic containers that use <br> to separate lines into multiple
 *   <p> paragraphs.
 * - Split <p> tags at direct <br> children into separate paragraphs.
 *
 * This prevents pasted content from collapsing into a single paragraph
 * with hard breaks, which makes Enter/splitBlock behave unexpectedly.
 */
function normalizePastedStructure(html: string): string {
  if (typeof document === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const skipTags = new Set([
    "pre",
    "code",
    "table",
    "blockquote",
    "li",
    "td",
    "th",
  ]);

  const blockTags = new Set([
    "p",
    "div",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "blockquote",
    "pre",
    "table",
    "figure",
    "hr",
    "section",
    "article",
  ]);

  // Container tags that should be unwrapped or converted to <p>.
  // We intentionally omit <figure> because it carries semantic meaning
  // (image + caption) that we don't want to flatten.
  const containerSelector = [
    "div",
    "section",
    "article",
    "main",
    "header",
    "footer",
    "aside",
    "nav",
  ].join(",");

  function isInsideSkipped(el: Element): boolean {
    let parent = el.parentElement;
    while (parent) {
      if (skipTags.has(parent.tagName.toLowerCase())) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  function unwrapOrConvertContainer(container: Element): void {
    const parent = container.parentNode;
    if (!parent || isInsideSkipped(container)) return;

    const hasBlockChildren = Array.from(container.children).some((child) =>
      blockTags.has(child.tagName.toLowerCase())
    );

    if (hasBlockChildren) {
      // Move every child out of the container, then remove the container itself.
      while (container.firstChild) {
        parent.insertBefore(container.firstChild, container);
      }
      parent.removeChild(container);
    } else {
      // Inline content: split at <br> into <p> paragraphs.
      const paragraphs: HTMLParagraphElement[] = [];
      let currentP = doc.createElement("p");

      const children = Array.from(container.childNodes);
      for (const node of children) {
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          (node as Element).tagName.toLowerCase() === "br"
        ) {
          if (currentP.childNodes.length > 0) {
            paragraphs.push(currentP);
            currentP = doc.createElement("p");
          }
        } else {
          currentP.appendChild(node.cloneNode(true));
        }
      }

      if (currentP.childNodes.length > 0) {
        paragraphs.push(currentP);
      }

      paragraphs.forEach((p) => parent.insertBefore(p, container));
      parent.removeChild(container);
    }
  }

  // ── 1. Unwrap or convert generic container tags ──
  const containers = Array.from(doc.body.querySelectorAll(containerSelector));
  for (const container of containers) {
    unwrapOrConvertContainer(container);
  }

  // ── 2. Split <p> tags at direct <br> children ──
  const ps = Array.from(doc.body.querySelectorAll("p"));
  for (const p of ps) {
    if (isInsideSkipped(p)) continue;

    const directBrs = Array.from(p.children).filter(
      (child) => child.tagName.toLowerCase() === "br"
    );
    if (directBrs.length === 0) continue;

    // Don't split if the paragraph already contains other block elements.
    const hasOtherBlocks = Array.from(p.children).some((child) => {
      const tag = child.tagName.toLowerCase();
      return tag !== "br" && blockTags.has(tag);
    });
    if (hasOtherBlocks) continue;

    const newPs: HTMLParagraphElement[] = [];
    let currentP = doc.createElement("p");

    // Preserve attributes from the original paragraph on each new one.
    for (const attr of Array.from(p.attributes)) {
      currentP.setAttribute(attr.name, attr.value);
    }

    const children = Array.from(p.childNodes);
    for (const node of children) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as Element).tagName.toLowerCase() === "br"
      ) {
        if (currentP.childNodes.length > 0) {
          newPs.push(currentP);
          currentP = doc.createElement("p");
          for (const attr of Array.from(p.attributes)) {
            currentP.setAttribute(attr.name, attr.value);
          }
        }
      } else {
        currentP.appendChild(node.cloneNode(true));
      }
    }

    if (currentP.childNodes.length > 0) {
      newPs.push(currentP);
    }

    if (newPs.length > 1) {
      const parent = p.parentNode;
      if (!parent) continue;
      newPs.forEach((np) => parent.insertBefore(np, p));
      parent.removeChild(p);
    }
  }

  return doc.body.innerHTML;
}

function removeConditionalComments(html: string): string {
  let result = html;
  let start = result.indexOf("<!--[if");
  while (start !== -1) {
    const end = result.indexOf("<![endif]-->", start);
    if (end === -1) break;
    result = result.slice(0, start) + result.slice(end + 12);
    start = result.indexOf("<!--[if");
  }
  return result;
}

function removeStyleBlocks(html: string): string {
  let result = html;
  let start = result.toLowerCase().indexOf("<style");
  while (start !== -1) {
    const end = result.toLowerCase().indexOf("</style>", start);
    if (end === -1) break;
    result = result.slice(0, start) + result.slice(end + 8);
    start = result.toLowerCase().indexOf("<style");
  }
  return result;
}
