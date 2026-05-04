"use client";

import { memo } from "react";
import type { Editor } from "@tiptap/react";

import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import {
  dispatchOpenBatchConvert,
  dispatchOpenTemplates,
} from "@/lib/events";
import { MenuDropdown, MenuItem, Sep } from "./primitives";

export interface EditorMenuProps {
  editor: Editor | null;
}

function FileMenuInner(_props: EditorMenuProps) {
  void _props;
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const reset = useEditorStore((s) => s.reset);
  const triggerFileOpen = useEditorStore((s) => s.triggerFileOpen);
  const prepareExport = useEditorStore((s) => s.prepareExport);
  const saveSnapshot = useEditorStore((s) => s.saveSnapshot);
  const openExportDialog = useUiStore((s) => s.openExportDialog);

  const hasDoc = documentHtml.trim().length > 0;

  const handleExport = (format: "html" | "zip" | "docx" | "md") => {
    prepareExport(format);
    openExportDialog();
  };

  const handleNewDocument = () => {
    if (hasDoc) {
      const { openConfirm } = require("@/store/dialogStore").useDialogStore.getState();
      openConfirm(
        "เอกสารใหม่ (New Document)",
        "ล้างเนื้อหาปัจจุบันและเริ่มเอกสารใหม่?",
        () => reset()
      );
    } else {
      reset();
    }
  };

  return (
    <MenuDropdown label="ไฟล์ (File)">
      <MenuItem
        label="เอกสารใหม่ (New)"
        shortcut="Ctrl+Shift+N"
        onClick={handleNewDocument}
      />
      <MenuItem label="เปิดไฟล์… (Open .docx, .html, .md)" onClick={triggerFileOpen} />
      <MenuItem
        label="แปลงเป็นกลุ่ม (Batch Convert)…"
        onClick={dispatchOpenBatchConvert}
      />
      <MenuItem
        label="เปิดจาก Template…"
        onClick={dispatchOpenTemplates}
      />
      <Sep />
      <MenuItem
        label="ส่งออก HTML"
        shortcut="Ctrl+S"
        disabled={!hasDoc}
        onClick={() => handleExport("html")}
      />
      <MenuItem
        label="ส่งออก ZIP"
        disabled={!hasDoc}
        onClick={() => handleExport("zip")}
      />
      <MenuItem
        label="ส่งออก DOCX"
        disabled={!hasDoc}
        onClick={() => handleExport("docx")}
      />
      <MenuItem
        label="ส่งออก Markdown"
        disabled={!hasDoc}
        onClick={() => handleExport("md")}
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

export const FileMenu = memo(FileMenuInner);
