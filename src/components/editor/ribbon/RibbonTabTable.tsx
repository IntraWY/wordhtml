"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash2,
  Merge,
  Split,
  AlignHorizontalDistributeCenter,
  PanelTop,
  SquareDashed,
  Square,
  TableRowsSplit,
  TableProperties,
  TableCellsMerge,
} from "lucide-react";

import { RibbonGroup } from "./RibbonGroup";
import { RibbonButton } from "./RibbonButton";
import { TableSizePicker } from "./TableSizePicker";
import { isLiveEditor, editorCan } from "@/lib/editorLive";
import { useUiStore } from "@/store/uiStore";
import {
  setSelectedCellBorders,
  selectionHasCell,
} from "@/lib/tiptap/tableCellBorder";
import { distributeColumnsEvenly } from "@/lib/tiptap/tableColumns";
import { selectWholeTable } from "@/lib/tiptap/tableProperties";

/**
 * Word-style "ตาราง (Table)" ribbon tab. Always present (so it never shifts the
 * tab indices) with buttons that disable when the caret is outside a table.
 * Reactivity follows the project rule: a single consolidated `useEditorState`
 * selector returning only primitives (mirrors MobileToolbar) — direct
 * `editor.isActive()` in JSX would not re-render on selection change.
 */
export function RibbonTabTable({ editor }: { editor: Editor | null }) {
  const hasEditor = isLiveEditor(editor);
  const openTableProperties = useUiStore((s) => s.openTableProperties);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      inTable: isLiveEditor(e) ? selectionHasCell(e) : false,
      canMerge: editorCan(e, (c) => c.mergeCells()),
      canSplit: editorCan(e, (c) => c.splitCell()),
      headerRow: e?.isActive("tableHeader") ?? false,
    }),
  });

  const inTable = state?.inTable ?? false;
  const canMerge = state?.canMerge ?? false;
  const canSplit = state?.canSplit ?? false;
  const headerRow = state?.headerRow ?? false;

  const run = (fn: (chain: ReturnType<Editor["chain"]>) => void) => {
    if (!isLiveEditor(editor)) return;
    const chain = editor.chain().focus();
    fn(chain);
  };

  return (
    <>
      <RibbonGroup label="แทรก (Insert)">
        <TableSizePicker editor={editor} disabled={!hasEditor} />
      </RibbonGroup>

      <RibbonGroup label="แถว (Rows)">
        <RibbonButton
          label="เพิ่มแถวด้านบน (Insert row above)"
          onClick={() => run((c) => c.addRowBefore().run())}
          disabled={!inTable}
        >
          <ArrowUpToLine />
        </RibbonButton>
        <RibbonButton
          label="เพิ่มแถวด้านล่าง (Insert row below)"
          onClick={() => run((c) => c.addRowAfter().run())}
          disabled={!inTable}
        >
          <ArrowDownToLine />
        </RibbonButton>
        <RibbonButton
          label="ลบแถว (Delete row)"
          onClick={() => run((c) => c.deleteRow().run())}
          disabled={!inTable}
        >
          <Trash2 />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="คอลัมน์ (Columns)">
        <RibbonButton
          label="เพิ่มคอลัมน์ด้านซ้าย (Insert column left)"
          onClick={() => run((c) => c.addColumnBefore().run())}
          disabled={!inTable}
        >
          <ArrowLeftToLine />
        </RibbonButton>
        <RibbonButton
          label="เพิ่มคอลัมน์ด้านขวา (Insert column right)"
          onClick={() => run((c) => c.addColumnAfter().run())}
          disabled={!inTable}
        >
          <ArrowRightToLine />
        </RibbonButton>
        <RibbonButton
          label="ลบคอลัมน์ (Delete column)"
          onClick={() => run((c) => c.deleteColumn().run())}
          disabled={!inTable}
        >
          <Trash2 />
        </RibbonButton>
        <RibbonButton
          label="กระจายความกว้างเท่ากัน (Distribute columns)"
          onClick={() => {
            if (isLiveEditor(editor)) {
              distributeColumnsEvenly(editor);
              editor.commands.focus();
            }
          }}
          disabled={!inTable}
        >
          <AlignHorizontalDistributeCenter />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="เซลล์ (Cells)">
        <RibbonButton
          label="ผสานเซลล์ (Merge cells)"
          onClick={() => run((c) => c.mergeCells().run())}
          disabled={!canMerge}
        >
          <Merge />
        </RibbonButton>
        <RibbonButton
          label="แยกเซลล์ (Split cell)"
          onClick={() => run((c) => c.splitCell().run())}
          disabled={!canSplit}
        >
          <Split />
        </RibbonButton>
        <RibbonButton
          label="สลับแถวหัวตาราง (Toggle header row)"
          onClick={() => run((c) => c.toggleHeaderRow().run())}
          active={headerRow}
          disabled={!inTable}
        >
          <PanelTop />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="เส้นขอบ (Borders)">
        <RibbonButton
          label="ซ่อนเส้นขอบเซลล์ (Hide cell borders)"
          onClick={() => {
            if (isLiveEditor(editor)) setSelectedCellBorders(editor, "none");
          }}
          disabled={!inTable}
        >
          <SquareDashed />
        </RibbonButton>
        <RibbonButton
          label="แสดงเส้นขอบเซลล์ (Show cell borders)"
          onClick={() => {
            if (isLiveEditor(editor)) setSelectedCellBorders(editor, "all");
          }}
          disabled={!inTable}
        >
          <Square />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="คุณสมบัติ (Properties)">
        <RibbonButton
          label="เลือกทั้งตาราง (Select whole table)"
          onClick={() => {
            if (isLiveEditor(editor)) selectWholeTable(editor);
          }}
          disabled={!inTable}
        >
          <TableCellsMerge />
        </RibbonButton>
        <RibbonButton
          label="คุณสมบัติตาราง / ระยะห่าง (Table properties)"
          onClick={openTableProperties}
          disabled={!inTable}
        >
          <TableProperties />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="ตาราง (Table)">
        <RibbonButton
          label="แยกตารางข้ามหน้า (Split table at cursor)"
          onClick={() => run((c) => c.splitTableAtCursor().run())}
          disabled={!inTable}
        >
          <TableRowsSplit />
        </RibbonButton>
        <RibbonButton
          label="ลบตาราง (Delete table)"
          onClick={() => run((c) => c.deleteTable().run())}
          disabled={!inTable}
        >
          <Trash2 />
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}
