import type { Editor } from "@tiptap/react";

export interface TocItem {
  level: number;
  text: string;
  id: string;
}

export function generateToc(html: string): TocItem[] {
  if (!html || typeof html !== "string") return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const items: TocItem[] = [];
  const seen = new Set<string>();

  headings.forEach((h, index) => {
    const level = parseInt(h.tagName[1], 10);
    const text = h.textContent?.trim() ?? "";
    let id = slugify(text) || `heading-${index + 1}`;
    if (seen.has(id)) {
      let suffix = 2;
      let candidate = `${id}-${suffix}`;
      while (seen.has(candidate)) {
        suffix++;
        candidate = `${id}-${suffix}`;
      }
      id = candidate;
    }
    seen.add(id);
    items.push({ level, text, id });
  });

  return items;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function buildTocHtml(items: TocItem[]): string {
  if (items.length === 0) return "";
  const lis = items
    .map(
      (item) =>
        `<li><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a></li>`
    )
    .join("");
  return `<ul class="toc">${lis}</ul>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function assignHeadingIds(editor: Editor): boolean {
  if (!editor) return false;
  const tr = editor.state.tr;
  let modified = false;
  let index = 0;
  const seen = new Set<string>();

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return;
    index++;
    const text = node.textContent;
    let id = slugify(text) || `heading-${index}`;
    if (seen.has(id)) {
      let suffix = 2;
      let candidate = `${id}-${suffix}`;
      while (seen.has(candidate)) {
        suffix++;
        candidate = `${id}-${suffix}`;
      }
      id = candidate;
    }
    seen.add(id);

    if (node.attrs.id !== id) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, id });
      modified = true;
    }
  });

  if (modified) {
    editor.view.dispatch(tr);
    return true;
  }
  return false;
}
