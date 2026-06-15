import type { Editor } from "@tiptap/react";
import { isLiveEditor } from "@/lib/editorLive";

type SearchCommands = {
  setSearchTerm?: (term: string) => boolean;
  resetIndex?: () => boolean;
};

interface SearchResult {
  from: number;
  to: number;
}

interface SearchStorage {
  results?: SearchResult[];
}

/**
 * Scroll the editor to the first `{{name}}` match via the search-and-replace
 * extension.
 *
 * The extension's commands always return `false` (they only mutate storage),
 * so "found" is detected by reading `storage.searchAndReplace.results` after
 * the term is set — the plugin recomputes results synchronously on dispatch.
 *
 * @returns `true` when the field was found and the selection moved to it,
 *          `false` when the editor is not live, the search extension is
 *          missing, or the field does not exist in the document.
 */
export function jumpToMergeField(editor: Editor, name: string): boolean {
  if (!isLiveEditor(editor)) return false;
  const term = `{{${name}}}`;
  const cmds = editor.commands as typeof editor.commands & SearchCommands;
  if (!cmds.setSearchTerm || !cmds.resetIndex) return false;

  cmds.setSearchTerm(term);
  cmds.resetIndex();

  const storage = (
    editor.storage as unknown as Record<string, SearchStorage | undefined>
  )["searchAndReplace"];
  const first = storage?.results?.[0];
  if (!first) return false;

  // Move the caret to the match — focus(position) also scrolls into view.
  editor.commands.focus(first.from);
  return true;
}
