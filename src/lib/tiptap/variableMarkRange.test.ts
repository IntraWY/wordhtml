import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { VariableMark } from "./variableMark";
import { insertVariableBadge } from "./insertVariableBadge";
import { handleVariableAdjacentSpace, handleVariableAdjacentTextInput } from "./variableAdjacentInput";
import {
  findVariableMarkRangeAtPos,
  isCursorAfterCompleteVariable,
} from "./variableMarkRange";

function createEditor(html = "<p></p>") {
  return new Editor({
    extensions: [StarterKit, VariableMark],
    content: html,
  });
}

describe("variable mark typing", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it("places the caret after insertVariableBadge", () => {
    editor = createEditor();
    insertVariableBadge(editor, 1, "customer");
    expect(editor.getHTML()).toContain('data-variable="customer"');
    expect(editor.state.doc.textBetween(1, editor.state.selection.from)).toBe(
      "{{customer}}"
    );
    expect(isCursorAfterCompleteVariable(editor.state)).toBe(true);
  });

  it("inserts a space after a dropped variable when Space is pressed inside the badge", () => {
    editor = createEditor();
    insertVariableBadge(editor, 1, "name");
    editor.commands.setTextSelection(3);
    const event = new KeyboardEvent("keydown", { key: " ", bubbles: true });
    const handled = handleVariableAdjacentSpace(editor, event);
    expect(handled).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{name}} ");
    expect(editor.state.selection.$from.parentOffset).toBe(9);
  });

  it("inserts a space when the caret is already after the badge", () => {
    editor = createEditor();
    insertVariableBadge(editor, 1, "name");
    const after = findVariableMarkRangeAtPos(editor.state, 2)!.to;
    editor.commands.setTextSelection(after);
    expect(isCursorAfterCompleteVariable(editor.state)).toBe(true);
    const event = new KeyboardEvent("keydown", { key: " ", bubbles: true });
    const handled = handleVariableAdjacentSpace(editor, event);
    expect(handled).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{name}} ");
  });

  it("types plain text outside the badge when caret is inside the mark", () => {
    editor = createEditor();
    insertVariableBadge(editor, 1, "customer");
    editor.commands.setTextSelection(3);
    const handled = handleVariableAdjacentTextInput(
      editor.view,
      editor.state.selection.from,
      editor.state.selection.to,
      "ทดสอบ"
    );
    expect(handled).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{customer}}ทดสอบ");
    const html = editor.getHTML();
    expect(html).toContain('data-variable="customer"');
    expect(html).not.toMatch(/data-variable="customer"[^>]*>[^<]*ทดสอบ/);
    expect(html).toContain("ทดสอบ");
  });
});
