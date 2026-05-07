"use client";

import { memo, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";
import { countWords } from "@/lib/text";
import { useDialogStore } from "@/store/dialogStore";
import { clearAllAppData } from "@/lib/storage";
import { exportAllSettings, importAllSettings } from "@/lib/settingsExport";
import { triggerDownload } from "@/lib/export/wrap";
import {
  dispatchOpenToc,
  dispatchOpenSearch,
  dispatchOpenPageSetup,
  dispatchOpenShortcuts,
  dispatchOpenHeaderFooter,
} from "@/lib/events";
import { MenuDropdown, MenuItem, Sep } from "./primitives";
import type { EditorMenuProps } from "./FileMenu";

function ToolsMenuInner(_props: EditorMenuProps) {
  void _props;
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const hasDoc = documentHtml.trim().length > 0;
  const autoCompressImages = useEditorStore((s) => s.autoCompressImages);
  const toggleAutoCompressImages = useEditorStore((s) => s.toggleAutoCompressImages);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    try {
      const blob = await exportAllSettings();
      triggerDownload(blob, `wordhtml-backup-${new Date().toISOString().slice(0, 10)}.wordhtml-backup.json`);
    } catch (e) {
      useDialogStore.getState().openAlert("สำรองข้อมูล (Export Settings)", e instanceof Error ? e.message : "ไม่สามารถสำรองข้อมูลได้");
    }
  };

  const handleImportFile = async (file: File) => {
    useDialogStore.getState().openConfirm(
      "กู้คืนข้อมูล (Import Settings)",
      "ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลจากไฟล์สำรอง ดำเนินการต่อ?",
      () => {
        (async () => {
          try {
            await importAllSettings(file);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } catch (e) {
            useDialogStore.getState().openAlert("กู้คืนข้อมูล (Import Settings)", e instanceof Error ? e.message : "ไม่สามารถกู้คืนข้อมูลได้");
          }
        })();
      }
    );
  };

  return (
    <MenuDropdown label="เครื่องมือ (Tools)">
      <MenuItem
        label="นับคำ (Word Count)"
        disabled={!hasDoc}
        onClick={() => {
          const count = countWords(documentHtml);
          useDialogStore.getState().openAlert("นับคำ (Word Count)", `จำนวนคำ: ${count.toLocaleString()} คำ`);
        }}
      />
      <MenuItem
        label="แสดงสารบัญ (Show TOC)"
        disabled={!hasDoc}
        onClick={dispatchOpenToc}
      />
      <Sep />
      <MenuItem
        label="ค้นหา/แทนที่ (Find & Replace)"
        shortcut="Ctrl+F"
        onClick={dispatchOpenSearch}
      />
      <MenuItem
        label="ตั้งค่าหน้ากระดาษ (Page Setup)…"
        onClick={dispatchOpenPageSetup}
      />
      <MenuItem
        label="หัวกระดาษ/ท้ายกระดาษ (Header & Footer)…"
        onClick={dispatchOpenHeaderFooter}
      />
      <Sep />
      <MenuItem
        label="คีย์ลัด (Shortcuts)…"
        shortcut="F1"
        onClick={dispatchOpenShortcuts}
      />
      <Sep />
      <MenuItem
        label="ตัวเลือกการทำความสะอาด…"
        onClick={() => {
          document
            .querySelector<HTMLElement>("[data-cleaning-toolbar]")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
      />
      <Sep />
      <MenuItem
        label="สำรองข้อมูล (Export Settings)…"
        onClick={handleExport}
      />
      <MenuItem
        label="กู้คืนข้อมูล (Import Settings)…"
        onClick={() => {
          fileInputRef.current?.click();
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          handleImportFile(file);
          e.target.value = "";
        }}
      />
      <Sep />
      <MenuItem
        label="บีบอัดรูปภาพอัตโนมัติ (Auto-compress images)"
        checked={autoCompressImages}
        onClick={toggleAutoCompressImages}
      />
      <Sep />
      <MenuItem
        label="ลบข้อมูลที่บันทึก (Clear Data)"
        onClick={() => {
          useDialogStore.getState().openConfirm(
            "ลบข้อมูลที่บันทึก (Clear Data)",
            "ลบข้อมูลทั้งหมดที่บันทึกไว้? รวมถึง Snapshot และ Template",
            () => {
              clearAllAppData();
            }
          );
        }}
      />
    </MenuDropdown>
  );
}

export const ToolsMenu = memo(ToolsMenuInner);
