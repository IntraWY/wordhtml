import type { Editor } from "@tiptap/react";
import { isLiveEditor } from "@/lib/editorLive";

type SearchCommands = {
  setSearchTerm: (term: string) => boolean;
  resetIndex: () => boolean;
  nextMatch: () => boolean;
};

/** Scroll editor selection to the first `{{name}}` match via search-and-replace extension. */
export function jumpToMergeField(editor: Editor, name: string): boolean {
  if (!isLiveEditor(editor)) return false;
  const term = `{{${name}}}`;
  const cmds = editor.commands as typeof editor.commands & SearchCommands;
  if (!cmds.setSearchTerm || !cmds.resetIndex || !cmds.nextMatch) return false;
  cmds.setSearchTerm(term);
  cmds.resetIndex();
  const found = cmds.nextMatch();
  editor.commands.focus();
  return found;
}
