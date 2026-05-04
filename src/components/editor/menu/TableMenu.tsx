"use client";

import { memo } from "react";
import { useEditorState } from "@tiptap/react";

import { MenuDropdown, MenuItem, Sep } from "./primitives";
import type { EditorMenuProps } from "./FileMenu";

function TableMenuInner({ editor }: EditorMenuProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      inTable: e?.isActive("table") ?? false,
      hasEditor: e !== null,
    }),
  });

  const inTable = state?.inTable ?? false;
  const hasEditor = state?.hasEditor ?? false;

  return (
    <MenuDropdown label="ตาราง (Table)">
      <MenuItem
        label="แทรกตาราง (Insert Table)"
        disabled={!hasEditor}
        onClick={() =>
          editor
            ?.chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      />
      <Sep />
      <MenuItem
        label="เพิ่มแถวด้านบน"
        disabled={!inTable}
        onClick={() => editor?.chain().focus().addRowBefore().run()}
      />
      <MenuItem
        label="เพิ่มแถวด้านล่าง"
        disabled={!inTable}
        onClick={() => editor?.chain().focus().addRowAfter().run()}
      />
      <MenuItem
        label="ลบแถว (Delete Row)"
        disabled={!inTable}
        onClick={() => editor?.chain().focus().deleteRow().run()}
      />
      <Sep />
      <MenuItem
        label="เพิ่มคอลัมน์ก่อนหน้า"
        disabled={!inTable}
        onClick={() => editor?.chain().focus().addColumnBefore().run()}
      />
      <MenuItem
        label="เพิ่มคอลัมน์ถัดไป"
        disabled={!inTable}
        onClick={() => editor?.chain().focus().addColumnAfter().run()}
      />
      <MenuItem
        label="ลบคอลัมน์ (Delete Column)"
        disabled={!inTable}
        onClick={() => editor?.chain().focus().deleteColumn().run()}
      />
      <Sep />
      <MenuItem
        label="ลบตาราง (Delete Table)"
        disabled={!inTable}
        danger
        onClick={() => editor?.chain().focus().deleteTable().run()}
      />
    </MenuDropdown>
  );
}

export const TableMenu = memo(TableMenuInner);
