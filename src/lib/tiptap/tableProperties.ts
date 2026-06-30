import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";
import { CellSelection, TableMap } from "@tiptap/pm/tables";
import { TableView } from "@tiptap/extension-table";

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

/**
 * The inline-style declarations this feature owns on the live `<table>` element.
 * They are cleared before re-applying so that toggling a property off (e.g.
 * cell spacing → 0) removes only that declaration and never the column widths
 * that prosemirror-tables writes via `table.style.width`.
 */
const MANAGED_TABLE_STYLE_PROPS = [
  "--wh-pad-t",
  "--wh-pad-r",
  "--wh-pad-b",
  "--wh-pad-l",
  "border-collapse",
  "border-spacing",
] as const;

/**
 * Apply the cell-margin / cell-spacing CSS onto a live `<table>` element,
 * mirroring the `cellMargins`/`cellSpacing` `renderHTML` output.
 *
 * Why this exists: with `Table.configure({ resizable: true })` the editor renders
 * tables through prosemirror-tables' `TableView`, which builds its own `<table>`
 * and only honours `node.attrs.style` — it never runs our global-attribute
 * `renderHTML`. So the margins/spacing that the export/Preview path emits via
 * `getHTML()` were invisible in the editor. `StyleAwareTableView` calls this on
 * construct + update to keep the editing surface in sync with the serialized
 * output. Uses `setProperty` (additive) so the table width set by `updateColumns`
 * is preserved.
 */
export function applyManagedTableStyle(
  table: HTMLTableElement,
  attrs: { cellMargins?: CellMargins | null; cellSpacing?: number | null }
): void {
  for (const prop of MANAGED_TABLE_STYLE_PROPS) {
    table.style.removeProperty(prop);
  }

  const m = attrs.cellMargins ?? null;
  if (m) {
    table.style.setProperty("--wh-pad-t", `${m.top}px`);
    table.style.setProperty("--wh-pad-r", `${m.right}px`);
    table.style.setProperty("--wh-pad-b", `${m.bottom}px`);
    table.style.setProperty("--wh-pad-l", `${m.left}px`);
  }

  const s = attrs.cellSpacing ?? null;
  if (s != null && s > 0) {
    table.style.setProperty("border-collapse", "separate");
    table.style.setProperty("border-spacing", `${s}px`);
  }
}

/**
 * Table node view that keeps the live `<table>` in sync with the
 * `cellMargins`/`cellSpacing` attributes. Wired via `Table.configure({ View })`
 * in `VisualEditor.tsx`; the base `TableView` still owns column resizing — we only
 * post-process the table element's inline style after it (re)renders.
 */
export class StyleAwareTableView extends TableView {
  constructor(node: PMNode, cellMinWidth: number) {
    super(node, cellMinWidth);
    applyManagedTableStyle(this.table, node.attrs);
  }

  update(node: PMNode): boolean {
    const ok = super.update(node);
    if (ok) applyManagedTableStyle(this.table, node.attrs);
    return ok;
  }
}
