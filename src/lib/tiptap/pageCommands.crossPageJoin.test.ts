import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Fragment } from "@tiptap/pm/model";
import { PagedDocument } from "./pagedDocument";
import { PageNode } from "./pageNode";
import { PageBodyNode } from "./pageBody";
import { PageBreak } from "./pageBreak";
import { PageBodyTrailingParagraph } from "./pageBodyTrailingParagraph";
import { PageCommands, joinBodyFragments } from "./pageCommands";

const TWO_PAGES = `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true"><p>Hello</p></div></div><div class="page-node" data-page-number="2"><div class="page-body" data-page-body="true"><p>World</p></div></div>`;

function createEditor(content: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ document: false }),
      PagedDocument,
      PageNode,
      PageBodyNode,
      PageBreak,
      PageBodyTrailingParagraph,
      PageCommands,
    ],
    content,
  });
}

/** Document position just inside the first text block that contains `needle`. */
function posAtStartOf(editor: Editor, needle: string): number {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found >= 0) return false;
    if (node.isTextblock && node.textContent.includes(needle)) {
      found = pos + 1; // +1 to step inside the textblock
      return false;
    }
    return true;
  });
  return found;
}

function posAtEndOf(editor: Editor, needle: string): number {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found >= 0) return false;
    if (node.isTextblock && node.textContent.includes(needle)) {
      found = pos + 1 + node.content.size;
      return false;
    }
    return true;
  });
  return found;
}

function pageCount(editor: Editor): number {
  let n = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "pageNode") n++;
    return true;
  });
  return n;
}

function paragraphTexts(editor: Editor): string[] {
  const out: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "paragraph") out.push(node.textContent);
    return true;
  });
  return out;
}

describe("joinBodyFragments", () => {
  let editor: Editor | null = null;
  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("joins matching boundary text blocks and reports the seam", () => {
    editor = createEditor(TWO_PAGES);
    const schema = editor.state.schema;
    const a = Fragment.from(schema.node("paragraph", null, schema.text("Hello")));
    const b = Fragment.from(schema.node("paragraph", null, schema.text("World")));

    const { content, seam } = joinBodyFragments(a, b);

    expect(content.childCount).toBe(1);
    expect(content.firstChild!.textContent).toBe("HelloWorld");
    // seam = open token (1) + "Hello".length (5)
    expect(seam).toBe(1 + 5);
  });

  it("concatenates without joining when boundary block types differ", () => {
    editor = createEditor(TWO_PAGES);
    const schema = editor.state.schema;
    const a = Fragment.from(
      schema.node("heading", { level: 1 }, schema.text("Title"))
    );
    const b = Fragment.from(schema.node("paragraph", null, schema.text("Body")));

    const { content, seam } = joinBodyFragments(a, b);

    expect(content.childCount).toBe(2);
    expect(seam).toBeNull();
  });

  it("lets an empty previous block absorb the next block's content", () => {
    editor = createEditor(TWO_PAGES);
    const schema = editor.state.schema;
    const a = Fragment.from(schema.node("paragraph")); // empty
    const b = Fragment.from(schema.node("paragraph", null, schema.text("Tail")));

    const { content, seam } = joinBodyFragments(a, b);

    expect(content.childCount).toBe(1);
    expect(content.firstChild!.textContent).toBe("Tail");
    expect(seam).toBe(1 + 0); // empty A → seam right at the block start
  });
});

describe("cross-page paragraph join (Backspace / Delete)", () => {
  let editor: Editor | null = null;
  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("mergeWithPreviousPage joins the boundary paragraphs", () => {
    editor = createEditor(TWO_PAGES);
    editor.commands.setTextSelection(posAtStartOf(editor, "World"));

    const ok = editor.commands.mergeWithPreviousPage();

    expect(ok).toBe(true);
    expect(pageCount(editor)).toBe(1);
    expect(paragraphTexts(editor)).toEqual(["HelloWorld"]);
  });

  it("mergeWithPreviousPage lands the caret at the seam", () => {
    editor = createEditor(TWO_PAGES);
    editor.commands.setTextSelection(posAtStartOf(editor, "World"));
    editor.commands.mergeWithPreviousPage();

    // Caret should sit between "Hello" and "World" → typing inserts there.
    editor.commands.insertContent("|");
    expect(paragraphTexts(editor)).toEqual(["Hello|World"]);
  });

  it("mergePage joins the next page's first line up (Delete)", () => {
    editor = createEditor(TWO_PAGES);
    editor.commands.setTextSelection(posAtEndOf(editor, "Hello"));

    const ok = editor.commands.mergePage();

    expect(ok).toBe(true);
    expect(pageCount(editor)).toBe(1);
    expect(paragraphTexts(editor)).toEqual(["HelloWorld"]);
  });

  it("removes an empty next page when joining (orphan-page cleanup)", () => {
    const withEmptyP2 = `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true"><p>Hello</p></div></div><div class="page-node" data-page-number="2"><div class="page-body" data-page-body="true"><p></p></div></div>`;
    editor = createEditor(withEmptyP2);
    editor.commands.setTextSelection(posAtEndOf(editor, "Hello"));

    const ok = editor.commands.mergePage();

    expect(ok).toBe(true);
    expect(pageCount(editor)).toBe(1);
    expect(paragraphTexts(editor)).toEqual(["Hello"]);
  });
});

const ONE_PAGE = `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true"><p>HelloWorld</p></div></div>`;

describe("splitPage (Ctrl+Enter)", () => {
  let editor: Editor | null = null;
  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("splits into two pages at the caret", () => {
    editor = createEditor(ONE_PAGE);
    // caret between "Hello" and "World"
    editor.commands.setTextSelection(posAtStartOf(editor, "HelloWorld") + 5);

    const ok = editor.commands.splitPage();

    expect(ok).toBe(true);
    expect(pageCount(editor)).toBe(2);
    expect(paragraphTexts(editor)).toEqual(["Hello", "World"]);
  });

  it("lands the caret on the new page, not the document end", () => {
    editor = createEditor(ONE_PAGE);
    editor.commands.setTextSelection(posAtStartOf(editor, "HelloWorld") + 5);
    editor.commands.splitPage();

    // Caret should sit at the start of the new page's "World" → typing prepends.
    editor.commands.insertContent(">");
    expect(paragraphTexts(editor)).toEqual(["Hello", ">World"]);
  });

  it("never produces a schema-invalid empty body (createAndFill)", () => {
    editor = createEditor(ONE_PAGE);
    // caret at the very end → contentAfter would otherwise be empty
    editor.commands.setTextSelection(posAtEndOf(editor, "HelloWorld"));
    editor.commands.splitPage();

    expect(pageCount(editor)).toBe(2);
    // both pages have a usable paragraph
    const texts = paragraphTexts(editor);
    expect(texts[0]).toBe("HelloWorld");
    expect(texts.length).toBe(2); // second page has an (empty) paragraph
  });
});
