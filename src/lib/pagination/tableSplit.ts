import type { Editor } from "@tiptap/react";

/**
 * When overflow is caused by a table, find a row boundary inside the table
 * instead of moving the whole table to the next page.
 */
export function findTableRowSplitPosition(
  editor: Editor,
  tableEl: HTMLElement,
  maxHeightPx: number
): number | null {
  const container = tableEl.closest(".ProseMirror") ?? tableEl.parentElement;
  if (!container) return null;

  const containerRect = container.getBoundingClientRect();
  const containerTop = containerRect.top;
  const rows = Array.from(tableEl.querySelectorAll("tr"));

  if (rows.length <= 1) return null;

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const rowRect = row.getBoundingClientRect();
    const rowBottom = rowRect.bottom - containerTop;
    if (rowBottom <= maxHeightPx + 4) {
      try {
        const pos = editor.view.posAtDOM(row, row.childNodes.length);
        if (typeof pos === "number" && pos >= 0) {
          const $pos = editor.state.doc.resolve(pos);
          return $pos.after();
        }
      } catch {
        /* try next row */
      }
    }
  }

  return null;
}
