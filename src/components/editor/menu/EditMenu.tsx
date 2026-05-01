"use client";

import { useEditorState } from "@tiptap/react";

import { MenuDropdown, MenuItem, Sep } from "./primitives";
import type { EditorMenuProps } from "./FileMenu";
import { useToastStore } from "@/store/toastStore";

export function EditMenu({ editor }: EditorMenuProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
      hasEditor: e !== null,
    }),
  });

  const canUndo = state?.canUndo ?? false;
  const canRedo = state?.canRedo ?? false;
  const hasEditor = state?.hasEditor ?? false;

  const handleCopyHtml = async () => {
    if (!editor) return;
    editor.chain().focus().run();
    try {
      await navigator.clipboard.writeText(editor.getHTML());
      useToastStore.getState().show("คัดลอก HTML แล้ว");
    } catch {
      window.alert("ไม่สามารถคัดลอกได้ — เบราว์เซอร์ไม่อนุญาต");
    }
  };

  return (
    <MenuDropdown label="แก้ไข (Edit)">
      <MenuItem
        label="เลิกทำ (Undo)"
        shortcut="Ctrl+Z"
        disabled={!canUndo}
        onClick={() => editor?.chain().focus().undo().run()}
      />
      <MenuItem
        label="ทำซ้ำ (Redo)"
        shortcut="Ctrl+Y"
        disabled={!canRedo}
        onClick={() => editor?.chain().focus().redo().run()}
      />
      <Sep />
      <MenuItem
        label="คัดลอกเป็น HTML (Copy as HTML)"
        disabled={!hasEditor}
        onClick={handleCopyHtml}
      />
      <Sep />
      <MenuItem
        label="เลือกทั้งหมด (Select All)"
        shortcut="Ctrl+A"
        disabled={!hasEditor}
        onClick={() => editor?.commands.selectAll()}
      />
    </MenuDropdown>
  );
}
