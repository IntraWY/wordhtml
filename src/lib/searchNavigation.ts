import type { Editor } from "@tiptap/react";
import { isLiveEditor } from "@/lib/editorLive";

/**
 * Helpers around the `@sereneinserenade/tiptap-search-and-replace` extension.
 *
 * The extension's navigation commands (`nextSearchResult` /
 * `previousSearchResult`) only advance `storage.searchAndReplace.resultIndex`
 * — they do NOT move the caret or scroll the match into view (same quirk
 * `jumpToMergeField` works around). So after stepping the index we read the
 * current `results[resultIndex]` range and focus it ourselves.
 *
 * NOTE: the previous SearchPanel called non-existent `nextMatch` /
 * `previousMatch` commands, so the next/previous buttons silently did nothing.
 */

interface SearchRange {
  from: number;
  to: number;
}

interface SearchStorage {
  results?: SearchRange[];
  resultIndex?: number;
}

type SearchNavCommands = {
  nextSearchResult?: () => boolean;
  previousSearchResult?: () => boolean;
};

function readStorage(editor: Editor): SearchStorage | undefined {
  return (editor.storage as unknown as Record<string, SearchStorage | undefined>)[
    "searchAndReplace"
  ];
}

/** `{ index, total }` for the current search — `index` is 1-based, 0 when none. */
export function getSearchResultInfo(editor: Editor | null): {
  index: number;
  total: number;
} {
  if (!isLiveEditor(editor)) return { index: 0, total: 0 };
  const storage = readStorage(editor);
  const total = storage?.results?.length ?? 0;
  if (total === 0) return { index: 0, total: 0 };
  const idx = storage?.resultIndex ?? 0;
  return { index: idx + 1, total };
}

/**
 * Step to the next/previous search match AND scroll it into view.
 *
 * @returns `true` when a match exists and the selection moved to it, `false`
 *          when the editor isn't live, the extension is missing, or there are
 *          no matches.
 */
export function goToSearchResult(
  editor: Editor | null,
  direction: "next" | "previous"
): boolean {
  if (!isLiveEditor(editor)) return false;
  const cmds = editor.commands as typeof editor.commands & SearchNavCommands;
  const step =
    direction === "next" ? cmds.nextSearchResult : cmds.previousSearchResult;
  if (!step) return false;

  // Advances resultIndex in storage (synchronously on dispatch).
  step();

  const storage = readStorage(editor);
  const results = storage?.results;
  if (!results || results.length === 0) return false;

  const idx = storage?.resultIndex ?? 0;
  const range = results[idx];
  if (!range) return false;

  // focus(position) moves the caret and scrolls the match into view.
  editor.commands.focus(range.from);
  return true;
}
