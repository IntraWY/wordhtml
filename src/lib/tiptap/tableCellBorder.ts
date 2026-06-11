import { TableCell, TableHeader } from "@tiptap/extension-table";
import type { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";

/**
 * Per-cell border control for form layouts (Thai official forms mix bordered
 * grids with borderless zones such as letterheads and signature rows).
 *
 * `borders: "none"` renders both `data-borders="none"` (editor CSS hook) and
 * an inline `border: none` style so exported HTML keeps the look without
 * depending on app CSS.
 */

type BordersValue = "all" | "none";

const borderAttribute = {
  borders: {
    default: "all" as BordersValue,
    parseHTML: (element: HTMLElement): BordersValue => {
      if (element.getAttribute("data-borders") === "none") return "none";
      // Imported HTML (e.g. from Excel) may carry only the inline style.
      const style = element.getAttribute("style") ?? "";
      if (/border(?:-\w+)*\s*:\s*(?:none|0)/i.test(style)) return "none";
      return "all";
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      if (attributes.borders !== "none") return {};
      return { "data-borders": "none", style: "border:none" };
    },
  },
};

export const TableCellWithBorder = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...borderAttribute };
  },
});

export const TableHeaderWithBorder = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...borderAttribute };
  },
});

/** Apply `borders` to every cell in the current cell selection (or the cell under the caret). */
export function setSelectedCellBorders(editor: Editor, borders: BordersValue): boolean {
  const { state } = editor;
  const { selection } = state;
  const tr = state.tr;
  let changed = false;

  const apply = (pos: number) => {
    const node = state.doc.nodeAt(pos);
    if (!node) return;
    if (node.type.name !== "tableCell" && node.type.name !== "tableHeader") return;
    if (node.attrs.borders === borders) return;
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, borders });
    changed = true;
  };

  if (selection instanceof CellSelection) {
    selection.forEachCell((_cell, pos) => apply(pos));
  } else {
    // Walk up from the caret to the enclosing cell.
    const $from = selection.$from;
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        apply($from.before(depth));
        break;
      }
    }
  }

  if (!changed) return false;
  editor.view.dispatch(tr);
  return true;
}

/** True when the caret/selection sits inside at least one table cell. */
export function selectionHasCell(editor: Editor): boolean {
  const { selection } = editor.state;
  if (selection instanceof CellSelection) return true;
  const $from = selection.$from;
  for (let depth = $from.depth; depth > 0; depth--) {
    const name = $from.node(depth).type.name;
    if (name === "tableCell" || name === "tableHeader") return true;
  }
  return false;
}
