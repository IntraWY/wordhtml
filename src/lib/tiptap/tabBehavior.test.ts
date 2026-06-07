import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { ParagraphFormatExtension } from "./paragraphFormat";

function createEditor(content = "<p>Hello world</p>") {
  return new Editor({
    extensions: [StarterKit, ParagraphFormatExtension],
    content,
  });
}

// Drive the actual keymap registered by the extension through ProseMirror's
// handleKeyDown prop, so we exercise the real position-aware Tab logic.
function pressTab(editor: Editor, shift = false) {
  return (
    editor.view.someProp("handleKeyDown", (f) =>
      f(
        editor.view,
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: shift })
      )
    ) ?? false
  );
}

describe("Word-style position-aware Tab", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("Tab at the very start of a paragraph indents the block (marginLeft)", () => {
    editor = createEditor();
    // Position 1 = the very start (parentOffset 0) of the first paragraph.
    editor.commands.setTextSelection(1);
    const before =
      (editor.state.selection.$from.parent.attrs.marginLeft as number) ?? 0;

    const handled = pressTab(editor);
    expect(handled).toBe(true);

    const after =
      (editor.state.doc.firstChild?.attrs.marginLeft as number) ?? 0;
    expect(after).toBeGreaterThan(before);
    expect(after).toBe(0.5);
  });

  it("Tab in the middle of paragraph text inserts a tab character", () => {
    editor = createEditor("<p>Hello world</p>");
    // "Hello world" — place caret after "Hello" (offset 6 in doc => parentOffset 5).
    editor.commands.setTextSelection(6);
    expect(editor.state.selection.$from.parentOffset).toBeGreaterThan(0);

    const handled = pressTab(editor);
    expect(handled).toBe(true);

    expect(editor.state.doc.textContent).toContain("\t");
    expect(editor.getText()).toContain("\t");
  });

  it("Shift-Tab removes a tab character immediately before the cursor", () => {
    editor = createEditor("<p>Hello world</p>");
    // Insert a tab in the middle first.
    editor.commands.setTextSelection(6);
    pressTab(editor);
    expect(editor.state.doc.textContent).toContain("\t");

    // Caret is now right after the inserted tab. Shift-Tab should remove it.
    const handled = pressTab(editor, true);
    expect(handled).toBe(true);
    expect(editor.state.doc.textContent).not.toContain("\t");
  });
});
