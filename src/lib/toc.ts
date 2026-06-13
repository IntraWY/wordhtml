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
  // Keep Unicode marks (\p{M}) — Thai vowels/tone marks (ุ ี ่ ้ …) are
  // nonspacing marks, not letters; stripping them turns "สรุป" into "สรป" and
  // breaks anchor↔heading id matching. We also skip NFD normalization so
  // composed Latin letters stay intact rather than decomposing into base +
  // mark. generateToc() and assignHeadingIds() share this fn, so ids and
  // anchor hrefs stay in lockstep.
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Default depth shown in an inserted TOC: H1–H3. */
export const TOC_DEFAULT_MAX_LEVEL = 3;
/** Default Thai title for an inserted TOC block. */
export const TOC_DEFAULT_TITLE = "สารบัญ";

export interface TocOptions {
  /** Deepest heading level included (default 3 → H1–H3). */
  maxLevel?: number;
  /** Title rendered above the list (default "สารบัญ"). */
  title?: string;
}

/**
 * Build the TOC list as nested `<ul>`s — one nesting step per heading level —
 * so the indent survives Tiptap (which keeps list structure but strips inline
 * styles). The top-level `<ul>` carries `class="toc"`, which is preserved in
 * the live editor by the BulletListWithClass extension and acts as the marker
 * for refresh ("อัปเดตสารบัญ"). Items deeper than `maxLevel` are dropped.
 */
export function buildTocHtml(items: TocItem[], maxLevel = 6): string {
  const visible = items.filter((i) => i.level >= 1 && i.level <= maxLevel);
  if (visible.length === 0) return "";

  let html = "";
  const stack: number[] = []; // levels with an open <ul>

  for (const item of visible) {
    if (stack.length === 0) {
      html += `<ul class="toc" data-toc="true">`;
      stack.push(item.level);
    } else if (item.level > stack[stack.length - 1]) {
      // one nesting step deeper, inside the still-open <li>
      html += "<ul>";
      stack.push(item.level);
    } else {
      html += "</li>";
      while (stack.length > 1 && item.level < stack[stack.length - 1]) {
        stack.pop();
        html += "</ul></li>";
      }
    }
    html += `<li><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a>`;
  }

  html += "</li>";
  while (stack.length > 1) {
    stack.pop();
    html += "</ul></li>";
  }
  html += "</ul>";
  return html;
}

/**
 * Full insertable TOC block: a `data-toc` wrapper with a Thai title paragraph
 * ("สารบัญ") and the anchor list, depth H1–H3 by default. The title is a bold
 * paragraph (NOT a heading) on purpose, so the TOC never lists itself.
 */
export function buildTocBlockHtml(items: TocItem[], options: TocOptions = {}): string {
  const { maxLevel = TOC_DEFAULT_MAX_LEVEL, title = TOC_DEFAULT_TITLE } = options;
  const list = buildTocHtml(items, maxLevel);
  if (!list) return "";
  return `<div data-toc="true"><p class="toc-title"><strong>${escapeHtml(title)}</strong></p>${list}</div>`;
}

/**
 * Refresh an existing TOC in an HTML string ("อัปเดตสารบัญ" behavior).
 * Looks for a `[data-toc]` wrapper first (raw/exported HTML); falls back to a
 * bare `ul.toc` (what the live editor keeps after Tiptap unwraps the div — in
 * that case only the list is swapped so the surviving title isn't duplicated).
 * Returns the updated HTML, or `null` when no TOC exists yet.
 */
export function replaceTocInHtml(
  html: string,
  items: TocItem[],
  options: TocOptions = {}
): string | null {
  if (!html || typeof html !== "string") return null;
  const { maxLevel = TOC_DEFAULT_MAX_LEVEL } = options;
  const doc = new DOMParser().parseFromString(html, "text/html");

  const block = doc.querySelector("[data-toc]:not(ul)");
  if (block) {
    block.outerHTML = buildTocBlockHtml(items, options);
    return doc.body.innerHTML;
  }

  const list = doc.querySelector("ul.toc, ul[data-toc]");
  if (list) {
    list.outerHTML = buildTocHtml(items, maxLevel);
    return doc.body.innerHTML;
  }

  return null;
}

/**
 * Find the existing TOC list in the live ProseMirror doc (a bulletList whose
 * preserved `class` contains "toc"). Returns its node range or null.
 */
export function findTocListRange(editor: Editor): { from: number; to: number } | null {
  if (!editor) return null;
  let range: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (range) return false;
    if (
      node.type.name === "bulletList" &&
      typeof node.attrs.class === "string" &&
      node.attrs.class.split(/\s+/).includes("toc")
    ) {
      range = { from: pos, to: pos + node.nodeSize };
      return false;
    }
    return true;
  });
  return range;
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
