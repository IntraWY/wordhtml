import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { createImageWithAlign } from "./imageWithAlign";
import { PagedDocument } from "./pagedDocument";
import { PageNode } from "./pageNode";
import { PageBodyNode } from "./pageBody";
import { PageBreak } from "./pageBreak";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function DummyNodeView() {
  return null;
}

function createEditor() {
  return new Editor({
    extensions: [
      StarterKit.configure({ document: false }),
      createImageWithAlign(DummyNodeView),
      PagedDocument,
      PageNode,
      PageBodyNode,
      PageBreak,
    ],
    content: `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true"><p></p></div></div>`,
  });
}

describe("imageWithAlign renderHTML", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("emits inline style for percentage widths", () => {
    editor = createEditor();
    editor.commands.focus("end");
    editor.commands.setImage({ src: TINY_PNG, width: "50%" as unknown as number });

    const html = editor.getHTML();
    expect(html).toMatch(/style="[^"]*width:\s*50%/);
    expect(html).toMatch(/width="50%"/);
  });

  it("emits inline style for pixel widths", () => {
    editor = createEditor();
    editor.commands.focus("end");
    editor.commands.setImage({ src: TINY_PNG, width: "320" as unknown as number, height: "200" as unknown as number });

    const html = editor.getHTML();
    expect(html).toMatch(/style="[^"]*width:\s*320px/);
    expect(html).toMatch(/width="320"/);
  });

  it("parses percentage width from inline style", () => {
    editor = createEditor();
    editor.commands.setContent(
      `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true"><img src="${TINY_PNG}" style="width:75%" /></div></div>`
    );

    let width: string | null = null;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "image" && width === null) {
        width = node.attrs.width as string | null;
      }
    });

    expect(width).toBe("75%");
    expect(editor.getHTML()).toMatch(/style="[^"]*width:\s*75%/);
  });
});
