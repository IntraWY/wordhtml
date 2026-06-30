import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";
import { CellSelection, TableMap } from "@tiptap/pm/tables";

/**
 * Word-style table properties (the "คลุมตาราง → ตั้งค่าระยะห่าง" dialog):
 *
 * - `cellMargins` (table-level) → inline CSS custom properties on `<table>`
 *   (`--wh-pad-t/r/b/l`). The `td,th { padding: var(--wh-pad-*, …) }` rule in
 *   globals.css / wrap.ts / exportPdf.ts reads them, so a single attribute sets
 *   the padding of every cell (a `<table>`'s own `padding` can't reach cells —
 *   custom properties cascade down and do). Word: Table Properties → Cell margins.
 * - `cellSpacing` (table-level) → inline `border-collapse:separate;border-spacing`
 *   when > 0, else omitted so the stylesheet's `collapse` wins. Word: "Allow
 *   spacing between cells".
 * - `rowHeight` (per-row) → inline `height` on `<tr>` (acts as a *minimum* — rows
 *   still grow with content, exactly Word's "Specify height"). 0/null = auto.
 *
 * Attributes are added via `addGlobalAttributes` (mirrors ParagraphFormatExtension)
 * so the existing `Table.configure(...)` and `RepeatingRow` extensions are left
 * untouched; global attributes merge additively with their own `addAttributes`.
 *
 * Horizontal lines are NOT draggable — prosemirror-tables only ships column
 * resizing, and row height is set numerically here, never by dragging.
 */

export interface CellMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TablePropertiesValues {
  cellMargins?: CellMargins | null;
  cellSpacing?: number | null;
  rowHeight?: number | null;
}

/** Display defaults (px) matching the current 0.4rem/0.6rem stylesheet padding. */
export const DEFAULT_CELL_MARGINS: CellMargins = { top: 6, right: 10, bottom: 6, left: 10 };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableProperties: {
      /** Apply cell margins / cell spacing (table) + row height (all rows) in one transaction. */
      setTableProperties: (values: TablePropertiesValues) => ReturnType;
    };
  }
}

const pxFromVar = (el: HTMLElement, name: string): number | null => {
  const raw = el.style.getPropertyValue(name);
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
};

const parseCellMargins = (el: HTMLElement): CellMargins | null => {
  const t = pxFromVar(el, "--wh-pad-t");
  const r = pxFromVar(el, "--wh-pad-r");
  const b = pxFromVar(el, "--wh-pad-b");
  const l = pxFromVar(el, "--wh-pad-l");
  if (t == null && r == null && b == null && l == null) return null;
  return {
    top: t ?? DEFAULT_CELL_MARGINS.top,
    right: r ?? DEFAULT_CELL_MARGINS.right,
    bottom: b ?? DEFAULT_CELL_MARGINS.bottom,
    left: l ?? DEFAULT_CELL_MARGINS.left,
  };
};

export const TablePropertiesExtension = Extension.create({
  name: "tableProperties",

  addGlobalAttributes() {
    return [
      {
        types: ["table"],
        attributes: {
          cellMargins: {
            default: null,
            renderHTML: (attrs) => {
              const m = attrs.cellMargins as CellMargins | null;
              if (!m) return {};
              return {
                style:
                  `--wh-pad-t:${m.top}px;--wh-pad-r:${m.right}px;` +
                  `--wh-pad-b:${m.bottom}px;--wh-pad-l:${m.left}px`,
              };
            },
            parseHTML: (el: HTMLElement): CellMargins | null => parseCellMargins(el),
          },
          cellSpacing: {
            default: null,
            renderHTML: (attrs) => {
              const s = attrs.cellSpacing as number | null;
              if (s == null || s <= 0) return {};
              return { style: `border-collapse:separate;border-spacing:${s}px` };
            },
            parseHTML: (el: HTMLElement): number | null => {
              const raw = el.style.borderSpacing;
              if (!raw) return null;
              const n = parseFloat(raw);
              return Number.isFinite(n) && n > 0 ? n : null;
            },
          },
        },
      },
      {
        types: ["tableRow"],
        attributes: {
          rowHeight: {
            default: null,
            renderHTML: (attrs) => {
              const h = attrs.rowHeight as number | null;
              if (h == null || h <= 0) return {};
              return { style: `height:${h}px` };
            },
            parseHTML: (el: HTMLElement): number | null => {
              const raw = el.style.height;
              if (!raw) return null;
              const n = parseFloat(raw);
              return Number.isFinite(n) && n > 0 ? n : null;
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTableProperties:
        (values: TablePropertiesValues) =>
        ({ tr, state, dispatch }) => {
          const found = findTable(state.selection.$from);
          if (!found) return false;
          if (!dispatch) return true;

          const { node: tableNode, pos: tablePos } = found;

          if (values.cellMargins !== undefined || values.cellSpacing !== undefined) {
            const attrs = { ...tableNode.attrs };
            if (values.cellMargins !== undefined) attrs.cellMargins = values.cellMargins;
            if (values.cellSpacing !== undefined) attrs.cellSpacing = values.cellSpacing;
            tr.setNodeMarkup(tablePos, undefined, attrs);
          }

          if (values.rowHeight !== undefined) {
            const contentStart = tablePos + 1;
            tableNode.forEach((rowNode, offset) => {
              if (rowNode.type.name !== "tableRow") return;
              tr.setNodeMarkup(contentStart + offset, undefined, {
                ...rowNode.attrs,
                rowHeight: values.rowHeight,
              });
            });
          }

          return true;
        },
    };
  },
});

type FoundTable = { node: PMNode; pos: number };

/** Walk up from a resolved position to the enclosing `table` node + its position. */
function findTable($from: ResolvedPos): FoundTable | null {
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "table") {
      return { node, pos: $from.before(depth) };
    }
  }
  return null;
}

/** Read the enclosing table's properties for seeding the dialog (defaults when unset). */
export function readTableProperties(editor: Editor): TablePropertiesValues {
  const found = findTable(editor.state.selection.$from);
  if (!found) {
    return { cellMargins: { ...DEFAULT_CELL_MARGINS }, cellSpacing: 0, rowHeight: 0 };
  }
  const { node } = found;
  const firstRow = node.firstChild;
  return {
    cellMargins: (node.attrs.cellMargins as CellMargins | null) ?? { ...DEFAULT_CELL_MARGINS },
    cellSpacing: (node.attrs.cellSpacing as number | null) ?? 0,
    rowHeight: (firstRow?.attrs.rowHeight as number | null) ?? 0,
  };
}

/** True when the caret/selection sits inside a table. */
export function selectionHasTable(editor: Editor): boolean {
  return findTable(editor.state.selection.$from) !== null;
}

/**
 * Select every cell of the enclosing table (Word's "คลุมทั้งตาราง"): builds a
 * CellSelection spanning the top-left → bottom-right cell. Returns false outside
 * a table.
 */
export function selectWholeTable(editor: Editor): boolean {
  const found = findTable(editor.state.selection.$from);
  if (!found) return false;
  const { node, pos } = found;
  const map = TableMap.get(node);
  if (map.map.length === 0) return false;
  const contentStart = pos + 1;
  const firstCell = contentStart + map.map[0];
  const lastCell = contentStart + map.map[map.map.length - 1];
  const selection = CellSelection.create(editor.state.doc, firstCell, lastCell);
  const tr = editor.state.tr.setSelection(selection);
  editor.view.dispatch(tr);
  editor.view.focus();
  return true;
}
