"use client";

import dynamic from "next/dynamic";
import { Download, Clock, Bookmark, Save, Split, Layers, LayoutTemplate } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/BrandLogo";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UploadButton } from "./UploadButton";
import { AuthButton } from "./AuthButton";
import {
  dispatchOpenTemplates,
  dispatchInsertPageBreak,
  dispatchOpenBatchConvert,
} from "@/lib/events";

const HistoryPanel = dynamic(
  () => import("./HistoryPanel").then((m) => m.HistoryPanel),
  { ssr: false, loading: () => null }
);

export function TopBar() {
  const enabledCleaners = useEditorStore((s) => s.enabledCleaners);
  const prepareExport = useEditorStore((s) => s.prepareExport);
  const saveSnapshot = useEditorStore((s) => s.saveSnapshot);
  const openHistoryPanel = useUiStore((s) => s.openHistoryPanel);
  const historyPanelOpen = useUiStore((s) => s.historyPanelOpen);
  const openExportDialog = useUiStore((s) => s.openExportDialog);
  const fileName = useEditorStore((s) => s.fileName);
  const hasDoc = useEditorStore((s) => s.documentHtml.length > 0);
  const historyCount = useEditorStore((s) => s.history.length);

  return (
    <>
      <header
        data-tour="welcome"
        className="flex h-14 shrink-0 items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5"
      >
        <div className="flex items-center gap-3">
          <BrandLogo showVersion />
          {fileName && (
            <>
              <span className="text-[color:var(--color-border-strong)]">/</span>
              <span className="max-w-xs truncate text-sm text-[color:var(--color-muted-foreground)]">
                {fileName}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <AuthButton />
          <ThemeToggle />
          <button
            type="button"
            onClick={openHistoryPanel}
            title="ประวัติเอกสาร"
            aria-label="ประวัติเอกสาร"
            className="relative inline-flex h-8 w-8 md:w-auto items-center justify-center gap-1.5 rounded-md px-0 md:px-2.5 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
          >
            <Clock className="size-4" />
            <span className="hidden md:inline text-sm">ประวัติ</span>
            {historyCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[9px] font-bold text-[color:var(--color-accent-foreground)]"
                aria-label={`จำนวนเอกสาร (Document count) ${historyCount}`}
              >
                {historyCount > 9 ? "9+" : historyCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => useUiStore.getState().openTemplateGallery()}
            title="แกลเลอรีเทมเพลต"
            aria-label="แกลเลอรีเทมเพลต"
            className="inline-flex h-8 w-8 md:w-auto items-center justify-center gap-1.5 rounded-md px-0 md:px-2.5 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
          >
            <LayoutTemplate className="size-4" />
            <span className="hidden md:inline text-sm">แกลเลอรี</span>
          </button>
          <button
            type="button"
            onClick={dispatchOpenTemplates}
            title="Template ของฉัน"
            aria-label="Template ของฉัน"
            className="inline-flex h-8 w-8 md:w-auto items-center justify-center gap-1.5 rounded-md px-0 md:px-2.5 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
          >
            <Bookmark className="size-4" />
            <span className="hidden md:inline text-sm">Template</span>
          </button>
          <button
            type="button"
            onClick={() => saveSnapshot()}
            disabled={!hasDoc}
            title="บันทึกเอกสาร (เปิดใหม่แล้วกลับมาอัตโนมัติ) — Save document"
            aria-label="บันทึกเอกสาร (เปิดใหม่แล้วกลับมาอัตโนมัติ)"
            className="inline-flex h-8 w-8 md:w-auto items-center justify-center gap-1.5 rounded-md px-0 md:px-2.5 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] disabled:opacity-40"
          >
            <Save className="size-4" />
            <span className="hidden md:inline text-sm">บันทึก</span>
          </button>
          <button
            type="button"
            onClick={dispatchInsertPageBreak}
            disabled={!hasDoc}
            title="แบ่งหน้า (Page Break)"
            aria-label="แบ่งหน้า (Page Break)"
            className="inline-flex h-8 w-8 md:w-auto items-center justify-center gap-1.5 rounded-md px-0 md:px-2.5 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] disabled:opacity-40"
          >
            <Split className="size-4" />
            <span className="hidden md:inline text-sm">แบ่งหน้า</span>
          </button>
          <button
            type="button"
            onClick={dispatchOpenBatchConvert}
            title="แปลงเป็นกลุ่ม (Batch convert)"
            aria-label="แปลงเป็นกลุ่ม (Batch convert)"
            className="inline-flex h-8 w-8 md:w-auto items-center justify-center gap-1.5 rounded-md px-0 md:px-2.5 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
          >
            <Layers className="size-4" />
            <span className="hidden md:inline text-sm">Batch</span>
          </button>
          <UploadButton />
          <Button
            data-tour="export"
            size="sm"
            className="bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)] shadow-sm transition-shadow hover:bg-[color:var(--color-accent-hover)] hover:shadow-md"
            onClick={() => {
              prepareExport();
              openExportDialog();
            }}
            disabled={!hasDoc}
            aria-label={`ส่งออก HTML พร้อมตัวทำความสะอาด ${enabledCleaners.length} รายการ`}
          >
            <Download />
            ส่งออก HTML
            {enabledCleaners.length > 0 && (
              <span
                className="ml-1 rounded-full bg-[color:var(--color-accent-foreground)]/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                aria-label={`ตัวทำความสะอาดที่เปิดใช้งาน (Active cleaners) ${enabledCleaners.length}`}
              >
                {enabledCleaners.length}
              </span>
            )}
          </Button>
        </div>
      </header>
      {historyPanelOpen && <HistoryPanel />}
    </>
  );
}
