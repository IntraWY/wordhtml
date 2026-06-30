import type { Editor } from "@tiptap/core";

/**
 * Reset every column of the table containing the selection to automatic width
 * by clearing each cell's `colwidth` attribute. Under `table-layout: fixed`
 * (see globals.css / wrap.ts) the browser then renders the columns equally —
 * the equivalent of Word's "Distribute Columns Evenly".
 *
 * Returns false (no-op) when the selection is not inside a table or no column
 * carries an explicit width.
 */
export function distributeColumnsEvenly(editor: Editor): boolean {
  const { state } = editor;
  const $from = state.selection.$from;

  // Walk up to the enclosing table node and its document position.
  let tableStart = -1;
  let table = null as ReturnType<typeof $from.node> | null;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "table") {
      table = node;
      tableStart = $from.before(depth) + 1; // first child of the table content
      break;
    }
  }
  if (!table || tableStart < 0) return false;

  const tr = state.tr;
  let changed = false;
  table.descendants((node, pos) => {
    if (node.type.name !== "tableCell" && node.type.name !== "tableHeader") {
      return true;
    }
    if (node.attrs.colwidth != null) {
      // `pos` is relative to the table's content; offset by tableStart.
      tr.setNodeMarkup(tableStart + pos, undefined, {
        ...node.attrs,
        colwidth: null,
      });
      changed = true;
    }
    return true;
  });

  if (!changed) return false;
  editor.view.dispatch(tr);
  return true;
}
