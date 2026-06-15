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
function dispatchPlainInsert(
  view: EditorView,
  insertPos: number,
  text: string
): boolean {
  const { state } = view;
  const variableMark = state.schema.marks.variable;
  let tr = state.tr;
  if (variableMark) {
    tr = tr.removeStoredMark(variableMark);
  }
  tr = tr.insert(insertPos, state.schema.text(text));
  const after = insertPos + text.length;
  tr.setSelection(TextSelection.create(tr.doc, after, after));
  view.dispatch(tr);
  exitSuggestion(view, variableSuggestionPluginKey);
  return true;
}

export function handleVariableAdjacentTextInput(
  view: EditorView,
  from: number,
  to: number,
  text: string
): boolean {
  if (!text) return false;

  const { state } = view;

  if (from === to && isCursorAfterCompleteVariable(state)) {
    return dispatchPlainInsert(view, from, text);
  }

  const insideFrom = findVariableMarkRangeAtPos(state, from);
  if (!insideFrom) return false;

  if (to !== from) {
    // `findVariableMarkRangeAtPos` is exclusive at the badge end (`pos < to`), so a
    // selection ending exactly on the badge boundary is still fully inside the badge.
    const insideTo =
      to <= insideFrom.to
        ? insideFrom
        : findVariableMarkRangeAtPos(state, to);
    if (!insideTo || insideFrom.from !== insideTo.from || insideFrom.to !== insideTo.to) {
      return false;
    }
    // Never delete inside the badge (would corrupt {{name}}); append after the mark.
    return dispatchPlainInsert(view, insideFrom.to, text);
  }

  return dispatchPlainInsert(view, insideFrom.to, text);
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
  dispatchPlainInsert(view, insertPos, " ");
  return true;
}
