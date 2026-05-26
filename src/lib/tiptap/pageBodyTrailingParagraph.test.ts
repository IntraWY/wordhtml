import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { PagedDocument } from "./pagedDocument";
import { PageNode } from "./pageNode";
import { PageBodyNode } from "./pageBody";
import { PageBreak } from "./pageBreak";
import { PageBodyTrailingParagraph } from "./pageBodyTrailingParagraph";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function createEditor(content?: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ document: false }),
      Image.configure({ inline: false, allowBase64: true }),
      PagedDocument,
      PageNode,
      PageBodyNode,
      PageBreak,
      PageBodyTrailingParagraph,
    ],
    content:
      content ??
      `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true"><p>Hello</p></div></div>`,
  });
}

function pageBodyLastChildType(editor: Editor): string | null {
  let lastType: string | null = null;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "pageBody" && node.childCount > 0) {
      lastType = node.lastChild!.type.name;
    }
  });
  return lastType;
}

describe("PageBodyTrailingParagraph", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("adds a trailing paragraph after an image at end of pageBody", () => {
    editor = createEditor();
    editor.commands.focus("end");
    editor.commands.setImage({ src: TINY_PNG, alt: "test" });

    expect(pageBodyLastChildType(editor)).toBe("paragraph");
    expect(editor.getHTML()).toMatch(/<img[\s\S]*<\/p>\s*<\/div>\s*<\/div>/);
  });

  it("allows placing cursor after image for typing", () => {
    editor = createEditor();
    editor.commands.focus("end");
    editor.commands.setImage({ src: TINY_PNG, alt: "test" });

    let imagePos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "image" && imagePos < 0) imagePos = pos;
    });
    expect(imagePos).toBeGreaterThan(-1);

    const afterImage = imagePos + editor.state.doc.nodeAt(imagePos)!.nodeSize;
    editor.commands.setTextSelection(afterImage);
    editor.commands.insertContent("after image");

    expect(editor.getHTML()).toContain("after image");
  });
});
