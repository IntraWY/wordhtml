"use client";

import type { Editor } from "@tiptap/react";

import { useEditorStore } from "@/store/editorStore";
import { MenuDropdown, MenuItem, Sep } from "./primitives";

export interface EditorMenuProps {
  editor: Editor | null;
}

export function FileMenu(_props: EditorMenuProps) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const reset = useEditorStore((s) => s.reset);
  const triggerFileOpen = useEditorStore((s) => s.triggerFileOpen);
  const openExportDialog = useEditorStore((s) => s.openExportDialog);
  const saveSnapshot = useEditorStore((s) => s.saveSnapshot);

  const hasDoc = documentHtml.trim().length > 0;

  return (
    <MenuDropdown label="ไฟล์ (File)">
      <MenuItem
        label="เอกสารใหม่ (New)"
        shortcut="Ctrl+Shift+N"
        onClick={reset}
      />
      <MenuItem label="เปิดไฟล์… (Open)" onClick={triggerFileOpen} />
      <MenuItem
        label="เปิดจาก Template…"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("wordhtml:open-templates"))
        }
      />
      <Sep />
      <MenuItem
        label="ส่งออก HTML"
        shortcut="Ctrl+S"
        disabled={!hasDoc}
        onClick={() => openExportDialog("html")}
      />
      <MenuItem
        label="ส่งออก ZIP"
        disabled={!hasDoc}
        onClick={() => openExportDialog("zip")}
      />
      <MenuItem
        label="ส่งออก DOCX"
        disabled={!hasDoc}
        onClick={() => openExportDialog("docx")}
      />
      <MenuItem
        label="ส่งออก Markdown"
        disabled={!hasDoc}
        onClick={() => openExportDialog("md")}
      />
      <Sep />
      <MenuItem
        label="บันทึก Snapshot"
        shortcut="Ctrl+Shift+S"
        disabled={!hasDoc}
        onClick={saveSnapshot}
      />
    </MenuDropdown>
  );
}
