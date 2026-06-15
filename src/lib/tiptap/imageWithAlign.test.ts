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

describe("imageWithAlign floating position", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  function imageAttrs(ed: Editor) {
    let attrs: Record<string, unknown> | null = null;
    ed.state.doc.descendants((node) => {
      if (node.type.name === "image" && attrs === null) {
        attrs = node.attrs as Record<string, unknown>;
      }
    });
    return attrs as Record<string, unknown> | null;
  }

  it("parses float position from data-float + inline style", () => {
    editor = createEditor();
    editor.commands.setContent(
      `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true"><img src="${TINY_PNG}" data-float="true" style="position:absolute;left:120px;top:60px;z-index:5" /></div></div>`
    );

    const attrs = imageAttrs(editor);
    expect(attrs).not.toBeNull();
    expect(attrs!.float).toBe(true);
    expect(attrs!.posX).toBe(120);
    expect(attrs!.posY).toBe(60);
    expect(attrs!.zIndex).toBe(5);
  });

  it("renders float position back to data-float + absolute style", () => {
    editor = createEditor();
    editor.commands.focus("end");
    editor.commands.setImage({ src: TINY_PNG });
    editor.commands.updateAttributes("image", {
      float: true,
      posX: 120,
      posY: 60,
      zIndex: 5,
    });

    const html = editor.getHTML();
    expect(html).toMatch(/data-float="true"/);
    expect(html).toMatch(/style="[^"]*position:\s*absolute/);
    expect(html).toMatch(/left:\s*120px/);
    expect(html).toMatch(/top:\s*60px/);
  });

  it("round-trips float position parse → render → parse", () => {
    editor = createEditor();
    editor.commands.setContent(
      `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true"><img src="${TINY_PNG}" data-float="true" style="position:absolute;left:80px;top:200px;z-index:7" /></div></div>`
    );
    const html = editor.getHTML();

    editor.commands.setContent(
      `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true">${html.match(/<img[^>]*>/)?.[0] ?? ""}</div></div>`
    );
    const attrs = imageAttrs(editor);
    expect(attrs!.float).toBe(true);
    expect(attrs!.posX).toBe(80);
    expect(attrs!.posY).toBe(200);
    expect(attrs!.zIndex).toBe(7);
  });

  it("does not emit float style for inline (non-floating) images", () => {
    editor = createEditor();
    editor.commands.focus("end");
    editor.commands.setImage({ src: TINY_PNG });

    const html = editor.getHTML();
    expect(html).not.toMatch(/data-float/);
    expect(html).not.toMatch(/position:\s*absolute/);
  });
});
