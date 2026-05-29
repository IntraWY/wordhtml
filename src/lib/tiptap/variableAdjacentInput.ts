import type { Editor } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import { exitSuggestion } from "@tiptap/suggestion";
import { TextSelection } from "@tiptap/pm/state";

import { variableSuggestionPluginKey } from "./suggestionPluginKeys";
import {
  findVariableMarkRangeAtPos,
  isCursorAfterCompleteVariable,
} from "./variableMarkRange";

/**
 * When typing inside a variable badge, insert plain text after the mark instead
 * of extending the badge styling to new characters.
 */
export function handleVariableAdjacentTextInput(
  view: EditorView,
  from: number,
  to: number,
  text: string
): boolean {
  if (!text || from !== to) return false;

  const { state } = view;
  const insideRange = findVariableMarkRangeAtPos(state, from);
  if (!insideRange) return false;

  const insertPos = insideRange.to;
  const tr = state.tr.insert(insertPos, state.schema.text(text));
  tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + text.length), 1));
  view.dispatch(tr);
  exitSuggestion(view, variableSuggestionPluginKey);
  return true;
}

/**
 * When Space is pressed beside a variable badge, insert a normal space outside the
 * mark and dismiss the `{{` suggestion popup (which blocks typing with allowSpaces: false).
 */
export function handleVariableAdjacentSpace(
  editor: Editor,
  event: KeyboardEvent
): boolean {
  if (event.key !== " ") return false;

  const { state, view } = editor;
  if (!state.selection.empty) return false;

  const { $from } = state.selection;
  const insideRange = findVariableMarkRangeAtPos(state, $from.pos);

  let insertPos: number | null = null;
  if (insideRange) {
    insertPos = insideRange.to;
  } else if (isCursorAfterCompleteVariable(state)) {
    insertPos = $from.pos;
  }

  if (insertPos === null) {
    const suggestionState = variableSuggestionPluginKey.getState(state);
    if (suggestionState?.active) {
      exitSuggestion(view, variableSuggestionPluginKey);
    }
    return false;
  }

  event.preventDefault();
  const tr = state.tr.insert(insertPos, state.schema.text(" "));
  tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1), 1));
  view.dispatch(tr);
  exitSuggestion(view, variableSuggestionPluginKey);
  return true;
}
