import type { Editor } from "@tiptap/react";
import { buildPruneEmptyPagesTransaction } from "./pruneEmptyPages";
import { isLiveEditor } from "@/lib/editorLive";

/** Pause auto-pagination briefly after manual merges/prunes (ms). */
export const PAGINATION_COOLDOWN_MS = 800;

export interface PaginationMaintenanceResult {
  pruned: number;
}

/**
 * Prunes orphan/empty pages and returns how many page nodes were removed.
 */
export function runPaginationMaintenance(
  editor: Editor | null
): PaginationMaintenanceResult {
  if (!isLiveEditor(editor)) return { pruned: 0 };

  const prune = buildPruneEmptyPagesTransaction(editor.state);
  if (!prune || prune.removed <= 0) return { pruned: 0 };

  editor.view.dispatch(prune.tr);
  return { pruned: prune.removed };
}
