import { Extension } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";

/**
 * Table split (A3). Splits the table containing the cursor into two tables at
 * the current row, repeating the first row (header) on the second table. This
 * lets a long table break across pages: the two resulting tables flow normally
 * through the (unchanged) pagination engine, which treats each as its own block.
 *
 * Deliberately a discrete, user-triggered command — NOT mid-flow splitting in
 * the reflow loop — so the table structure is never mangled and the reflow
 * model stays intact. Every cell is preserved (no data loss).
 */
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableSplit: {
      splitTableAtCursor: () => ReturnType;
    };
  }
}

export const TableSplit = Extension.create({
  name: "tableSplit",

  addCommands() {
    return {
      splitTableAtCursor:
        () =>
        ({ state, dispatch }) => {
          const { $from } = state.selection;

          // Find the enclosing table node + its depth.
          let depth = -1;
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === "table") {
              depth = d;
              break;
            }
          }
          if (depth < 0) return false;

          const tableNode = $from.node(depth);
          const tablePos = $from.before(depth);
          const rowIndex = $from.index(depth); // row containing the cursor

          const rows: import("@tiptap/pm/model").Node[] = [];
          tableNode.forEach((row) => rows.push(row));

          // Need a header row (row 0) and a real split point after it.
          if (rows.length < 2 || rowIndex <= 0 || rowIndex >= rows.length) {
            return false;
          }

          const header = rows[0];
          const firstRows = rows.slice(0, rowIndex);
          const secondRows = [header, ...rows.slice(rowIndex)];

          const tableA = tableNode.copy(Fragment.fromArray(firstRows));
          const tableB = tableNode.copy(Fragment.fromArray(secondRows));

          if (dispatch) {
            const tr = state.tr.replaceWith(
              tablePos,
              tablePos + tableNode.nodeSize,
              [tableA, tableB]
            );
            dispatch(tr);
          }
          return true;
        },
    };
  },
});
