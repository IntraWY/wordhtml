import { afterEach, describe, expect, it } from "vitest";
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

describe("ParagraphFormatExtension HTML roundtrip", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("keeps margin-left after setIndent + setLineSpacing roundtrip", () => {
    editor = createEditor();
    editor.commands.focus("end");
    expect(editor.commands.setIndent(1.5, 0)).toBe(true);
    expect(editor.commands.setLineSpacing("oneHalf")).toBe(true);

    const html = editor.getHTML();
    expect(html).toMatch(/margin-left:\s*1\.5cm/);
    expect(html).toMatch(/line-height:\s*1\.5/);

    editor.commands.setContent(html);
    const roundtripped = editor.getHTML();
    expect(roundtripped).toMatch(/margin-left:\s*1\.5cm/);
    expect(roundtripped).toMatch(/line-height:\s*1\.5/);
  });

  it("preserves a literal tab character across a setContent roundtrip", () => {
    // Word-style mid-line Tab inserts a real \t (paragraphFormat.ts). It must
    // survive the store → editor re-parse (auto-restore on reload, snapshot
    // load, file open). ProseMirror collapses whitespace by default, so the
    // parse must opt into preserveWhitespace: "full".
    editor = createEditor();
    editor.commands.focus("end");
    editor.commands.insertContent("before\tafter");

    const html = editor.getHTML();
    expect(html).toContain("\t");

    editor.commands.setContent(html, {
      parseOptions: { preserveWhitespace: "full" },
    });
    expect(editor.getHTML()).toContain("\t");
  });
});
