import { TableRow } from "@tiptap/extension-table";
import type { Editor } from "@tiptap/core";

export const RepeatingRow = TableRow.extend({
  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      dataRepeat: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-repeat") === "true",
        renderHTML: (attrs) => {
          if (!attrs.dataRepeat) return {};
          return { "data-repeat": "true" };
        },
      },
      dataRepeatSource: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-repeat-source") ?? null,
        renderHTML: (attrs) => {
          if (!attrs.dataRepeatSource) return {};
          return { "data-repeat-source": attrs.dataRepeatSource as string };
        },
      },
    };
  },
});

/** Position of the tableRow node enclosing the caret, or null outside a table. */
function findRowAtSelection(editor: Editor): { pos: number; attrs: Record<string, unknown> } | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "tableRow") {
      return { pos: $from.before(depth), attrs: node.attrs };
    }
  }
  return null;
}

/** True when the row under the caret is marked data-repeat. */
export function isRepeatRow(editor: Editor): boolean {
  return Boolean(findRowAtSelection(editor)?.attrs.dataRepeat);
}

/**
 * Toggle data-repeat on the row under the caret. At export, repeating rows
 * duplicate per item of any list variables they contain (expandRepeatingRows).
 */
export function toggleRepeatRow(editor: Editor): boolean {
  const row = findRowAtSelection(editor);
  if (!row) return false;
  const tr = editor.state.tr.setNodeMarkup(row.pos, undefined, {
    ...row.attrs,
    dataRepeat: !row.attrs.dataRepeat,
  });
  editor.view.dispatch(tr);
  return true;
}
