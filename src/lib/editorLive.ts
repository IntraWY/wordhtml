import type { Editor } from "@tiptap/react";

export function isLiveEditor(editor: Editor | null | undefined): editor is Editor {
  return !!editor && !editor.isDestroyed;
}

/** Safely call editor.can().command() — returns false if the editor is not ready. */
export function editorCan(
  editor: Editor | null | undefined,
  check: (can: ReturnType<Editor["can"]>) => boolean
): boolean {
  if (!isLiveEditor(editor)) return false;
  try {
    return check(editor.can());
  } catch {
    return false;
  }
}
