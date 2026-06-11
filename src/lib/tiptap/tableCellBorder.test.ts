import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table";
import {
  TableCellWithBorder,
  TableHeaderWithBorder,
  setSelectedCellBorders,
  selectionHasCell,
} from "./tableCellBorder";

function createEditor(content: string) {
  return new Editor({
    extensions: [
      StarterKit,
      Table,
      TableRow,
      TableHeaderWithBorder,
      TableCellWithBorder,
    ],
    content,
  });
}

const TWO_CELL_TABLE =
  "<table><tbody><tr><td><p>A</p></td><td><p>B</p></td></tr></tbody></table>";

describe("TableCellWithBorder", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("defaults to bordered cells with no extra markup", () => {
    editor = createEditor(TWO_CELL_TABLE);
    expect(editor.getHTML()).not.toContain("data-borders");
  });

  it("hides borders on the cell under the caret and renders attr + inline style", () => {
    editor = createEditor(TWO_CELL_TABLE);
    editor.commands.focus("start");
    expect(selectionHasCell(editor)).toBe(true);
    expect(setSelectedCellBorders(editor, "none")).toBe(true);

    const html = editor.getHTML();
    expect(html).toContain('data-borders="none"');
    // jsdom re-serializes the border shorthand oddly ("border: medium"), so
    // only assert that an inline border style is present; browsers keep
    // "border: none" and the data-borders attr is the canonical carrier.
    expect(html).toMatch(/style="[^"]*border/);
    // Only the first cell changed.
    expect(html.match(/data-borders="none"/g)).toHaveLength(1);
  });

  it("round-trips borders=none through getHTML → setContent", () => {
    editor = createEditor(TWO_CELL_TABLE);
    editor.commands.focus("start");
    setSelectedCellBorders(editor, "none");

    const html = editor.getHTML();
    editor.commands.setContent(html);
    expect(editor.getHTML()).toContain('data-borders="none"');
  });

  it("restores borders with borders=all (removes attr and style)", () => {
    editor = createEditor(TWO_CELL_TABLE);
    editor.commands.focus("start");
    setSelectedCellBorders(editor, "none");
    expect(editor.getHTML()).toContain('data-borders="none"');

    editor.commands.focus("start");
    expect(setSelectedCellBorders(editor, "all")).toBe(true);
    expect(editor.getHTML()).not.toContain("data-borders");
  });

  it("parses imported HTML that only carries inline border:none (e.g. from Excel)", () => {
    editor = createEditor(
      '<table><tbody><tr><td style="border:none"><p>A</p></td></tr></tbody></table>'
    );
    expect(editor.getHTML()).toContain('data-borders="none"');
  });

  it("reports no cell outside a table", () => {
    editor = createEditor("<p>plain paragraph</p>");
    editor.commands.focus("start");
    expect(selectionHasCell(editor)).toBe(false);
    expect(setSelectedCellBorders(editor, "none")).toBe(false);
  });
});
