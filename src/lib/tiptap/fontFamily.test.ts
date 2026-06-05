import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { TextStyle } from "@tiptap/extension-text-style";

// Creates an editor that mirrors the FIXED VisualEditor.tsx setup
// (TextStyle registered before Color and FontFamily).
function createEditor() {
  return new Editor({
    extensions: [StarterKit, TextStyle, Color, FontFamily],
    content: "<p>Hello</p>",
  });
}

describe("FontFamily + Color require TextStyle", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("setFontFamily applies font-family to selected text", () => {
    editor = createEditor();
    editor.commands.selectAll();
    const ok = editor.commands.setFontFamily("Sarabun");
    expect(ok).toBe(true);
    expect(editor.getAttributes("textStyle").fontFamily).toBe("Sarabun");
  });

  it("setFontFamily is reflected in HTML output", () => {
    editor = createEditor();
    editor.commands.selectAll();
    editor.commands.setFontFamily("Sarabun");
    expect(editor.getHTML()).toMatch(/font-family:\s*Sarabun/);
  });

  it("setColor applies color to selected text", () => {
    editor = createEditor();
    editor.commands.selectAll();
    const ok = editor.commands.setColor("#ff0000");
    expect(ok).toBe(true);
    expect(editor.getAttributes("textStyle").color).toBe("#ff0000");
  });

  it("setColor is reflected in HTML output", () => {
    editor = createEditor();
    editor.commands.selectAll();
    editor.commands.setColor("#ff0000");
    // Tiptap/browser normalises hex → rgb in inline style
    expect(editor.getHTML()).toMatch(/color:\s*(#ff0000|rgb\(255,\s*0,\s*0\))/i);
  });

  it("font-family survives removeInlineStyles export cleaner", async () => {
    const { removeInlineStyles } = await import("@/lib/cleaning/cleaners");
    const html = `<p><span style="font-family:Sarabun">Hello</span></p>`;
    const result = removeInlineStyles(html);
    expect(result).toMatch(/font-family:\s*Sarabun/);
  });
});
