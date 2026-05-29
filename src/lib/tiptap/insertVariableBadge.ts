import type { Editor } from "@tiptap/core";
import { exitSuggestion } from "@tiptap/suggestion";
import { TextSelection } from "@tiptap/pm/state";

import { variableSuggestionPluginKey } from "./suggestionPluginKeys";

export function exitVariableSuggestion(editor: Editor): void {
  exitSuggestion(editor.view, variableSuggestionPluginKey);
}

/** Remove plain `{{}}` placeholder when the caret sits inside it (from Insert → Variable). */
function deleteEmptyBracePlaceholderAtPos(
  editor: Editor,
  pos: number
): { state: typeof editor.state; pos: number } {
  const { state } = editor;
  const $pos = state.doc.resolve(pos);
  if (!$pos.parent.isTextblock) return { state, pos };

  const parentStart = $pos.start();
  const text = $pos.parent.textContent;
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const idx = text.indexOf("{{", searchFrom);
    if (idx === -1) break;
    const from = parentStart + idx;
    const slice = text.slice(idx);
    const to =
      slice.startsWith("{{}}")
        ? from + 4
        : slice.startsWith("}}", 2)
          ? from + 4
          : from + 2;
    if (pos >= from && pos <= to) {
      const tr = state.tr.delete(from, to);
      editor.view.dispatch(tr);
      return { state: editor.view.state, pos: from };
    }
    searchFrom = idx + 1;
  }
  return { state, pos };
}

/** Insert `{{name}}` with the variable mark and place the caret after it. */
export function insertVariableBadge(
  editor: Editor,
  pos: number,
  name: string
): void {
  const cleared = deleteEmptyBracePlaceholderAtPos(editor, pos);
  let { state } = cleared;
  const { view } = editor;
  pos = cleared.pos;

  const variableMark = state.schema.marks.variable;
  if (!variableMark) return;

  const text = `{{${name}}}`;
  const node = state.schema.text(text, [variableMark.create({ name })]);
  let tr = state.tr.insert(pos, node);
  const after = pos + node.nodeSize;
  tr = tr.removeStoredMark(variableMark);
  tr.setSelection(TextSelection.create(tr.doc, after, after));
  view.dispatch(tr);
  exitVariableSuggestion(editor);
  editor.commands.focus();
}
