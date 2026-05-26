import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { ParagraphFormatExtension } from "./paragraphFormat";
import { PagedDocument } from "./pagedDocument";
import { PageNode } from "./pageNode";
import { PageBodyNode } from "./pageBody";
import { PageBreak } from "./pageBreak";

function createEditor() {
  return new Editor({
    extensions: [
      StarterKit.configure({ document: false }),
      PagedDocument,
      PageNode,
      PageBodyNode,
      PageBreak,
      ParagraphFormatExtension,
    ],
    content: `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true"><p>Hello</p></div></div>`,
  });
}

describe("ParagraphFormatExtension commands", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("setIndent updates paragraph on collapsed selection inside page body", () => {
    editor = createEditor();
    editor.commands.focus("end");
    const ok = editor.commands.setIndent(1.5, 0);
    expect(ok).toBe(true);
    const html = editor.getHTML();
    expect(html).toMatch(/margin-left:\s*1\.5cm/);
  });
});
