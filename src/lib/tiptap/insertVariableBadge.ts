import type { Editor } from "@tiptap/core";
import { exitSuggestion } from "@tiptap/suggestion";
import { TextSelection } from "@tiptap/pm/state";

import { variableSuggestionPluginKey } from "./suggestionPluginKeys";

export function exitVariableSuggestion(editor: Editor): void {
  exitSuggestion(editor.view, variableSuggestionPluginKey);
}

/** Insert `{{name}}` with the variable mark and place the caret after it. */
export function insertVariableBadge(
  editor: Editor,
  pos: number,
  name: string
): void {
  const { state, view } = editor;
  const variableMark = state.schema.marks.variable;
  if (!variableMark) return;

  const text = `{{${name}}}`;
  const node = state.schema.text(text, [variableMark.create({ name })]);
  const tr = state.tr.insert(pos, node);
  const after = pos + node.nodeSize;
  tr.setSelection(TextSelection.near(tr.doc.resolve(after), 1));
  view.dispatch(tr);
  exitVariableSuggestion(editor);
  editor.commands.focus();
}
