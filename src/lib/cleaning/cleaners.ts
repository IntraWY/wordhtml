/**
 * Eight pure HTML cleaners. Each takes an HTML string and returns a new one.
 *
 * They use DOMParser (available in browsers and in jsdom for tests).
 * `plainText` is special: it discards markup entirely and returns text.
 */

const PRESERVE_ATTRS_BY_TAG: Record<string, ReadonlyArray<string>> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
  ol: ["start", "type"],
  iframe: ["src", "title"],
  source: ["src", "srcset", "type"],
  video: ["src", "poster", "controls"],
  audio: ["src", "controls"],
};

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "keygen", "link", "meta", "param", "source", "track", "wbr",
]);

function parse(html: string): Document {
  const wrapped = `<!doctype html><html><body>${html}</body></html>`;
  return new DOMParser().parseFromString(wrapped, "text/html");
}

function serialize(doc: Document): string {
  return doc.body.innerHTML;
}

function walk(root: Node, visit: (node: Node) => void): void {
  // Snapshot children first so the visitor can safely mutate the tree.
  const children = Array.from(root.childNodes);
  for (const child of children) {
    walk(child, visit);
    visit(child);
  }
}

// ---------- 1. Remove inline styles ----------
export function removeInlineStyles(html: string): string {
  if (!html) return html;
  const doc = parse(html);
  doc.body.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
  return serialize(doc);
}

// ---------- 2. Remove empty tags ----------
export function removeEmptyTags(html: string): string {
  if (!html) return html;
  const doc = parse(html);

  const isMeaningfulVoid = (el: Element): boolean => {
    const tag = el.tagName.toLowerCase();
    return VOID_ELEMENTS.has(tag) && tag !== "br"; // <br> alone counts as empty
  };

  const isEmpty = (el: Element): boolean => {
    if (isMeaningfulVoid(el)) return false;
    if (el.textContent && el.textContent.trim().length > 0) return false;
    // Has any meaningful descendant (image, hr, etc.)?
    const meaningful = el.querySelector("img, hr, iframe, video, audio, source");
    return meaningful === null;
  };

  // Iterate until stable: removing one tag may make its parent empty.
  let removed = true;
  while (removed) {
    removed = false;
    const all = Array.from(doc.body.querySelectorAll("*"));
    for (const el of all) {
      if (isEmpty(el)) {
        el.remove();
        removed = true;
      }
    }
  }
  return serialize(doc);
}

// ---------- 3. Collapse successive spaces ----------
export function collapseSpaces(html: string): string {
  if (!html) return html;
  const doc = parse(html);
  walk(doc.body, (node) => {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      node.nodeValue = node.nodeValue.replace(/[ \t]+/g, " ").replace(/\n[ \t]+/g, "\n");
    }
  });
  // Also collapse leading/trailing whitespace inside the serialized output
  return serialize(doc).replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
}

// ---------- 4. Remove tag attributes (preserve safe ones) ----------
export function removeAttributes(html: string): string {
  if (!html) return html;
  const doc = parse(html);
  doc.body.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const preserve = PRESERVE_ATTRS_BY_TAG[tag] ?? [];
    // Iterate over a snapshot — removing attrs mutates the live NamedNodeMap
    const names = Array.from(el.attributes).map((a) => a.name);
    for (const name of names) {
      if (!preserve.includes(name)) {
        el.removeAttribute(name);
      }
    }
  });
  return serialize(doc);
}

// ---------- 5. Remove class & id attributes ----------
export function removeClassesAndIds(html: string): string {
  if (!html) return html;
  const doc = parse(html);
  doc.body.querySelectorAll("[class], [id]").forEach((el) => {
    el.removeAttribute("class");
    el.removeAttribute("id");
  });
  return serialize(doc);
}

// ---------- 6. Remove HTML comments ----------
export function removeComments(html: string): string {
  if (!html) return html;
  const doc = parse(html);
  const toRemove: Comment[] = [];
  walk(doc.body, (node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      toRemove.push(node as Comment);
    }
  });
  for (const c of toRemove) c.remove();
  return serialize(doc);
}

// ---------- 7a. Unwrap deprecated tags ----------
/**
 * Unwrap deprecated/presentational HTML tags (font, center, big, tt, strike).
 * Removes the wrapper but keeps the children, so users can re-apply formatting
 * via the editor's semantic tools.
 */
export function unwrapDeprecatedTags(html: string): string {
  if (!html.trim()) return html;
  const doc = parse(html);
  const tags = ["font", "center", "big", "tt", "strike"];
  for (const tag of tags) {
    const els = Array.from(doc.body.getElementsByTagName(tag));
    for (const el of els) {
      const parent = el.parentNode;
      if (!parent) continue;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
  }
  return serialize(doc);
}

// ---------- 7. Unwrap <span> tags ----------
export function unwrapSpans(html: string): string {
  if (!html) return html;
  const doc = parse(html);
  const spans = Array.from(doc.body.querySelectorAll("span"));
  for (const span of spans) {
    const parent = span.parentNode;
    if (!parent) continue;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  }
  return serialize(doc);
}

// ---------- 8. Convert to plain text ----------
export function plainText(html: string): string {
  if (!html) return html;
  const doc = parse(html);

  // Insert line breaks for block-level elements before extracting text
  const blockTags = new Set([
    "p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "pre", "tr",
  ]);
  walk(doc.body, (node) => {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      blockTags.has((node as Element).tagName.toLowerCase())
    ) {
      (node as Element).appendChild(doc.createTextNode("\n"));
    }
  });

  const text = (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}
