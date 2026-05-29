import type { EditorState } from "@tiptap/pm/state";

/** Range of a single variable mark text span containing `pos`, if any. */
export function findVariableMarkRangeAtPos(
  state: EditorState,
  pos: number
): { from: number; to: number } | null {
  const variableMark = state.schema.marks.variable;
  if (!variableMark) return null;

  const $pos = state.doc.resolve(pos);
  const activeMark = $pos.marks().find((m) => m.type === variableMark);
  if (!activeMark) return null;

  const parent = $pos.parent;
  const parentStart = $pos.start();
  let rangeFrom: number | null = null;
  let rangeTo: number | null = null;

  parent.forEach((child, offset) => {
    if (!child.isText) return;
    const hasMark = child.marks.some(
      (m) => m.type === variableMark && m.eq(activeMark)
    );
    if (!hasMark) return;
    const from = parentStart + offset;
    const to = from + child.nodeSize;
    if (pos >= from && pos <= to) {
      rangeFrom = from;
      rangeTo = to;
    }
  });

  if (rangeFrom === null || rangeTo === null) return null;
  return { from: rangeFrom, to: rangeTo };
}

const COMPLETE_VARIABLE_BEFORE_CURSOR =
  /\{\{[A-Za-z_\u0E00-\u0E7F][\w\u0E00-\u0E7F_]*\}\}$/;

/** True when the cursor sits immediately after a completed `{{name}}` token in the parent block. */
export function isCursorAfterCompleteVariable(state: EditorState): boolean {
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return false;
  const textBefore = $from.parent.textBetween(
    0,
    $from.parentOffset,
    undefined,
    "\ufffc"
  );
  return COMPLETE_VARIABLE_BEFORE_CURSOR.test(textBefore);
}
