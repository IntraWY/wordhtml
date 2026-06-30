import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { CellSelection } from "@tiptap/pm/tables";
import { RepeatingRow } from "./repeatingRow";
import { TableCellWithBorder, TableHeaderWithBorder } from "./tableCellBorder";
import {
  TablePropertiesExtension,
  readTableProperties,
  selectWholeTable,
  DEFAULT_CELL_MARGINS,
} from "./tableProperties";

function createEditor(content: string) {
  return new Editor({
    extensions: [
      StarterKit,
      Table,
      RepeatingRow,
      TableHeaderWithBorder,
      TableCellWithBorder,
      TablePropertiesExtension,
    ],
    content,
  });
}

// 2 rows × 2 columns.
const TABLE_2x2 =
  "<table><tbody>" +
  "<tr><td><p>A</p></td><td><p>B</p></td></tr>" +
  "<tr><td><p>C</p></td><td><p>D</p></td></tr>" +
  "</tbody></table>";

describe("TablePropertiesExtension", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("applies cell margins, cell spacing (table) and row height (every row)", () => {
    editor = createEditor(TABLE_2x2);
    editor.commands.focus("start");

    const ok = editor.commands.setTableProperties({
      cellMargins: { top: 5, right: 7, bottom: 9, left: 11 },
      cellSpacing: 8,
      rowHeight: 30,
    });
    expect(ok).toBe(true);

    const html = editor.getHTML();
    // Cell margins as custom properties on the <table>, in t/r/b/l order.
    expect(html).toMatch(/--wh-pad-t:\s*5px/);
    expect(html).toMatch(/--wh-pad-r:\s*7px/);
    expect(html).toMatch(/--wh-pad-b:\s*9px/);
    expect(html).toMatch(/--wh-pad-l:\s*11px/);
    // Cell spacing switches the table to separate borders.
    expect(html).toMatch(/border-spacing:\s*8px/);
    expect(html).toMatch(/border-collapse:\s*separate/);
    // Row height on each of the two rows.
    expect((html.match(/height:\s*30px/g) ?? []).length).toBe(2);
  });

  it("omits cell spacing and row height when set to 0/null", () => {
    editor = createEditor(TABLE_2x2);
    editor.commands.focus("start");

    editor.commands.setTableProperties({
      cellMargins: { top: 4, right: 4, bottom: 4, left: 4 },
      cellSpacing: null,
      rowHeight: null,
    });

    const html = editor.getHTML();
    expect(html).toMatch(/--wh-pad-t:\s*4px/);
    expect(html).not.toContain("border-spacing");
    expect(html).not.toMatch(/border-collapse:\s*separate/);
    expect(html).not.toMatch(/height:\s*\d+px/);
  });

  it("readTableProperties reflects the applied values", () => {
    editor = createEditor(TABLE_2x2);
    editor.commands.focus("start");
    editor.commands.setTableProperties({
      cellMargins: { top: 3, right: 6, bottom: 3, left: 6 },
      cellSpacing: 5,
      rowHeight: 24,
    });

    const v = readTableProperties(editor);
    expect(v.cellMargins).toEqual({ top: 3, right: 6, bottom: 3, left: 6 });
    expect(v.cellSpacing).toBe(5);
    expect(v.rowHeight).toBe(24);
  });

  it("round-trips margins/spacing/height through getHTML → setContent", () => {
    editor = createEditor(TABLE_2x2);
    editor.commands.focus("start");
    editor.commands.setTableProperties({
      cellMargins: { top: 5, right: 7, bottom: 9, left: 11 },
      cellSpacing: 8,
      rowHeight: 30,
    });

    const html = editor.getHTML();
    editor.commands.setContent(html);
    const again = editor.getHTML();

    expect(again).toMatch(/--wh-pad-t:\s*5px/);
    expect(again).toMatch(/--wh-pad-l:\s*11px/);
    expect(again).toMatch(/border-spacing:\s*8px/);
    expect((again.match(/height:\s*30px/g) ?? []).length).toBe(2);
  });

  it("selectWholeTable creates a CellSelection over every cell", () => {
    editor = createEditor(TABLE_2x2);
    editor.commands.focus("start");

    expect(selectWholeTable(editor)).toBe(true);
    const selection = editor.state.selection;
    expect(selection instanceof CellSelection).toBe(true);

    let cells = 0;
    (selection as CellSelection).forEachCell(() => {
      cells += 1;
    });
    expect(cells).toBe(4);
  });

  it("is a no-op outside a table (defaults from readTableProperties)", () => {
    editor = createEditor("<p>plain paragraph</p>");
    editor.commands.focus("start");

    expect(editor.commands.setTableProperties({ cellSpacing: 5 })).toBe(false);
    expect(selectWholeTable(editor)).toBe(false);
    expect(readTableProperties(editor).cellMargins).toEqual(DEFAULT_CELL_MARGINS);
  });
});
