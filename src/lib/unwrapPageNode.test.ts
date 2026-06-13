import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { unwrapPageNode } from "./unwrapPageNode";
import { PageNode } from "./tiptap/pageNode";
import { PageBodyNode } from "./tiptap/pageBody";
import { PagedDocument } from "./tiptap/pagedDocument";
import { PageBreak } from "./tiptap/pageBreak";

/**
 * Regression coverage for the A1 header/footer silent-data-loss bug:
 * `unwrapPageNode` (used on every store/persist/export of a single-page doc)
 * must NOT drop an editable header/footer, and the stored string must survive
 * a wrap→parse round-trip.
 */

const DEFAULT_SETUP = {
  size: "A4" as const,
  orientation: "portrait" as const,
  marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
};

/** Mirror of VisualEditor.wrapInPageNode (header/footer-aware) for round-trip. */
function wrapInPageNode(html: string): string {
  if (html.includes('class="page-node"')) return html;
  const open = `<div class="page-node" data-page-number="1" data-page-setup='${JSON.stringify(DEFAULT_SETUP)}'>`;
  if (html.trim() === "") {
    return `${open}<div class="page-body" data-page-body="true"><p></p></div></div>`;
  }
  const doc = new DOMParser().parseFromString(
    `<div id="r">${html}</div>`,
    "text/html"
  );
  const root = doc.getElementById("r")!;
  let headerHtml = "";
  let footerHtml = "";
  const first = root.firstElementChild;
  if (first && first.matches(".page-header[data-page-header]")) {
    headerHtml = first.outerHTML;
    first.remove();
  }
  const last = root.lastElementChild;
  if (last && last.matches(".page-footer[data-page-footer]")) {
    footerHtml = last.outerHTML;
    last.remove();
  }
  const bodyHtml = root.innerHTML;
  const body = `<div class="page-body" data-page-body="true">${bodyHtml.trim() === "" ? "<p></p>" : bodyHtml}</div>`;
  return `${open}${headerHtml}${body}${footerHtml}</div>`;
}

function createPageEditor(html: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ document: false }),
      PagedDocument,
      PageNode,
      PageBodyNode,
      PageBreak,
    ],
    content: html,
  });
}

describe("unwrapPageNode", () => {
  it("returns body-only HTML for a plain single page (no header/footer)", () => {
    const html =
      '<div class="page-node"><div class="page-body" data-page-body="true"><p>Hello</p></div></div>';
    expect(unwrapPageNode(html)).toBe("<p>Hello</p>");
  });

  it("preserves an editable header for a single page", () => {
    const html =
      '<div class="page-node">' +
      '<div class="page-header" data-page-header="true">Top</div>' +
      '<div class="page-body" data-page-body="true"><p>Body</p></div>' +
      "</div>";
    const out = unwrapPageNode(html);
    expect(out).toContain('data-page-header="true"');
    expect(out).toContain("Top");
    expect(out).toContain("<p>Body</p>");
  });

  it("preserves both header and footer for a single page", () => {
    const html =
      '<div class="page-node">' +
      '<div class="page-header" data-page-header="true">H</div>' +
      '<div class="page-body" data-page-body="true"><p>Body</p></div>' +
      '<div class="page-footer" data-page-footer="true">F</div>' +
      "</div>";
    const out = unwrapPageNode(html);
    expect(out).toContain('data-page-header="true"');
    expect(out).toContain('data-page-footer="true"');
    expect(out).toContain("H");
    expect(out).toContain("F");
    expect(out).toContain("<p>Body</p>");
  });

  it("leaves multi-page HTML unchanged", () => {
    const html =
      '<div class="page-node"><div class="page-body" data-page-body="true"><p>A</p></div></div>' +
      '<div class="page-node"><div class="page-body" data-page-body="true"><p>B</p></div></div>';
    expect(unwrapPageNode(html)).toBe(html);
  });
});

describe("unwrap -> store -> wrap -> parse round-trip", () => {
  let editor: Editor | null = null;
  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("a single-page document WITH a header survives the round-trip", () => {
    const initial =
      '<div class="page-node">' +
      '<div class="page-header" data-page-header="true">Government Header</div>' +
      '<div class="page-body" data-page-body="true"><p>Document body</p></div>' +
      "</div>";

    // 1. Editor parses + serializes (what onUpdate sees via getHTML).
    editor = createPageEditor(initial);
    const editorHtml = editor.getHTML();

    // 2. Store/persist/export path.
    const stored = unwrapPageNode(editorHtml);
    expect(stored).toContain('data-page-header="true"');
    expect(stored).toContain("Government Header");

    // 3. Reload: wrap the stored string back into a page node, re-parse.
    const wrapped = wrapInPageNode(stored);
    editor.destroy();
    editor = createPageEditor(wrapped);
    const reloaded = editor.getHTML();

    expect(reloaded).toContain('data-page-header="true"');
    expect(reloaded).toContain("Government Header");
    expect(reloaded).toContain("Document body");
  });

  it("a single-page document WITH header and footer survives the round-trip", () => {
    const initial =
      '<div class="page-node">' +
      '<div class="page-header" data-page-header="true">Header text</div>' +
      '<div class="page-body" data-page-body="true"><p>Body text</p></div>' +
      '<div class="page-footer" data-page-footer="true">Footer text</div>' +
      "</div>";

    editor = createPageEditor(initial);
    const stored = unwrapPageNode(editor.getHTML());
    const wrapped = wrapInPageNode(stored);
    editor.destroy();
    editor = createPageEditor(wrapped);
    const reloaded = editor.getHTML();

    expect(reloaded).toContain('data-page-header="true"');
    expect(reloaded).toContain('data-page-footer="true"');
    expect(reloaded).toContain("Header text");
    expect(reloaded).toContain("Footer text");
    expect(reloaded).toContain("Body text");
  });
});
