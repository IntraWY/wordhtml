import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { PageNode } from "./pageNode";
import { PageBodyNode } from "./pageBody";
import { PagedDocument } from "./pagedDocument";
import { PageBreak } from "./pageBreak";
import {
  PageHeaderFooter,
  pageHasHeader,
  pageHasFooter,
} from "./pageHeaderFooter";

/**
 * Real Editor harness matching VisualEditor's page schema. PageNode bundles
 * PageHeaderNode + PageFooterNode automatically (addExtensions), so we only need
 * PagedDocument + PageNode + PageBodyNode + PageBreak + the command extension.
 */
function createEditor(html: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ document: false }),
      PagedDocument,
      PageNode,
      PageBodyNode,
      PageBreak,
      PageHeaderFooter,
    ],
    content: html,
  });
}

const ONE_PAGE =
  '<div class="page-node"><div data-page-body><p>Page one</p></div></div>';

const TWO_PAGES =
  '<div class="page-node"><div data-page-body><p>Page one</p></div></div>' +
  '<div class="page-node"><div data-page-body><p>Page two</p></div></div>';

/** Place the caret inside the first page body. */
function caretInFirstBody(editor: Editor) {
  // Body paragraph starts a few tokens into the doc; position 2 is safely inside
  // the first page's first paragraph.
  editor.commands.setTextSelection(2);
}

function headerCount(editor: Editor): number {
  let n = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "pageHeader") n++;
  });
  return n;
}

function footerCount(editor: Editor): number {
  let n = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "pageFooter") n++;
  });
  return n;
}

describe("PageHeaderFooter commands", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it("insertPageHeader adds exactly one header to the current page", () => {
    editor = createEditor(ONE_PAGE);
    caretInFirstBody(editor);
    expect(headerCount(editor)).toBe(0);
    editor.chain().focus().insertPageHeader().run();
    expect(headerCount(editor)).toBe(1);
  });

  it("insertPageHeader is idempotent — second insert is a no-op", () => {
    editor = createEditor(ONE_PAGE);
    caretInFirstBody(editor);
    editor.chain().focus().insertPageHeader().run();
    const ok = editor.chain().focus().insertPageHeader().run();
    expect(ok).toBe(false);
    expect(headerCount(editor)).toBe(1);
  });

  it("insertPageFooter adds exactly one footer to the current page", () => {
    editor = createEditor(ONE_PAGE);
    caretInFirstBody(editor);
    expect(footerCount(editor)).toBe(0);
    editor.chain().focus().insertPageFooter().run();
    expect(footerCount(editor)).toBe(1);
  });

  it("insertPageFooter is idempotent — second insert is a no-op", () => {
    editor = createEditor(ONE_PAGE);
    caretInFirstBody(editor);
    editor.chain().focus().insertPageFooter().run();
    const ok = editor.chain().focus().insertPageFooter().run();
    expect(ok).toBe(false);
    expect(footerCount(editor)).toBe(1);
  });

  it("removePageHeader deletes the header on the current page", () => {
    editor = createEditor(ONE_PAGE);
    caretInFirstBody(editor);
    editor.chain().focus().insertPageHeader().run();
    expect(headerCount(editor)).toBe(1);
    caretInFirstBody(editor);
    editor.chain().focus().removePageHeader().run();
    expect(headerCount(editor)).toBe(0);
  });

  it("removePageFooter deletes the footer on the current page", () => {
    editor = createEditor(ONE_PAGE);
    caretInFirstBody(editor);
    editor.chain().focus().insertPageFooter().run();
    caretInFirstBody(editor);
    editor.chain().focus().removePageFooter().run();
    expect(footerCount(editor)).toBe(0);
  });

  it("removePageHeader is a no-op when no header exists", () => {
    editor = createEditor(ONE_PAGE);
    caretInFirstBody(editor);
    const ok = editor.chain().focus().removePageHeader().run();
    expect(ok).toBe(false);
  });

  it("insertPageHeader { allPages: true } adds a header to every page", () => {
    editor = createEditor(TWO_PAGES);
    caretInFirstBody(editor);
    editor.chain().focus().insertPageHeader({ allPages: true }).run();
    expect(headerCount(editor)).toBe(2);
  });

  it("insertPageFooter { allPages: true } adds a footer to every page", () => {
    editor = createEditor(TWO_PAGES);
    caretInFirstBody(editor);
    editor.chain().focus().insertPageFooter({ allPages: true }).run();
    expect(footerCount(editor)).toBe(2);
  });

  it("removePageHeader { allPages: true } removes headers from every page", () => {
    editor = createEditor(TWO_PAGES);
    caretInFirstBody(editor);
    editor.chain().focus().insertPageHeader({ allPages: true }).run();
    expect(headerCount(editor)).toBe(2);
    editor.chain().focus().removePageHeader({ allPages: true }).run();
    expect(headerCount(editor)).toBe(0);
  });

  it("single-page insert only affects the page containing the selection", () => {
    editor = createEditor(TWO_PAGES);
    caretInFirstBody(editor);
    editor.chain().focus().insertPageHeader().run();
    expect(headerCount(editor)).toBe(1);
  });
});

describe("pageHasHeader / pageHasFooter helpers", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it("pageHasHeader is false before insert, true after", () => {
    editor = createEditor(ONE_PAGE);
    caretInFirstBody(editor);
    expect(pageHasHeader(editor.state)).toBe(false);
    editor.chain().focus().insertPageHeader().run();
    caretInFirstBody(editor);
    expect(pageHasHeader(editor.state)).toBe(true);
  });

  it("pageHasFooter is false before insert, true after", () => {
    editor = createEditor(ONE_PAGE);
    caretInFirstBody(editor);
    expect(pageHasFooter(editor.state)).toBe(false);
    editor.chain().focus().insertPageFooter().run();
    caretInFirstBody(editor);
    expect(pageHasFooter(editor.state)).toBe(true);
  });

  it("pageHasHeader reflects only the current page, not siblings", () => {
    editor = createEditor(TWO_PAGES);
    // Insert a header on page 1 only.
    caretInFirstBody(editor);
    editor.chain().focus().insertPageHeader().run();

    // Caret on page 1 → true.
    caretInFirstBody(editor);
    expect(pageHasHeader(editor.state)).toBe(true);

    // Move caret to page 2's body → false.
    const pageTwoPos = (() => {
      let found = -1;
      let seen = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "pageBody") {
          seen++;
          if (seen === 2) found = pos + 1;
        }
      });
      return found;
    })();
    editor.commands.setTextSelection(pageTwoPos);
    expect(pageHasHeader(editor.state)).toBe(false);
  });
});
