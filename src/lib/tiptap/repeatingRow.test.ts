import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader } from "@tiptap/extension-table";
import { RepeatingRow, isRepeatRow, toggleRepeatRow } from "./repeatingRow";

function createEditor(content: string) {
  return new Editor({
    extensions: [StarterKit, Table, RepeatingRow, TableHeader, TableCell],
    content,
  });
}

const TABLE =
  "<table><tbody><tr><td><p>หัว</p></td></tr><tr><td><p>รายการ</p></td></tr></tbody></table>";

describe("repeat row toggle", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("reports false outside a table and does not toggle", () => {
    editor = createEditor("<p>ข้อความ</p>");
    editor.commands.focus("start");
    expect(isRepeatRow(editor)).toBe(false);
    expect(toggleRepeatRow(editor)).toBe(false);
  });

  it("toggles data-repeat on the row under the caret and round-trips", () => {
    editor = createEditor(TABLE);
    editor.commands.focus("start"); // caret in first row
    expect(isRepeatRow(editor)).toBe(false);

    expect(toggleRepeatRow(editor)).toBe(true);
    expect(isRepeatRow(editor)).toBe(true);
    const html = editor.getHTML();
    expect(html).toContain('data-repeat="true"');
    // Only one row marked
    expect(html.match(/data-repeat="true"/g)).toHaveLength(1);

    // Round-trip through setContent keeps the attr
    editor.commands.setContent(html);
    editor.commands.focus("start");
    expect(isRepeatRow(editor)).toBe(true);

    // Toggle off removes it
    expect(toggleRepeatRow(editor)).toBe(true);
    expect(editor.getHTML()).not.toContain("data-repeat");
  });

  it("parses existing data-repeat rows (gallery templates)", () => {
    editor = createEditor(
      '<table><tbody><tr data-repeat="true"><td><p>{{ลำดับ}}</p></td></tr></tbody></table>'
    );
    editor.commands.focus("start");
    expect(isRepeatRow(editor)).toBe(true);
  });
});
