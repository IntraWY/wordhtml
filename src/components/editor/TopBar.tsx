"use client";

import Link from "next/link";
import { Download, Clock, FileCode2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { useTemplateStore } from "@/store/templateStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UploadButton } from "./UploadButton";
import { HistoryPanel } from "./HistoryPanel";

export function TopBar() {
  const enabledCleaners = useEditorStore((s) => s.enabledCleaners);
  const prepareExport = useEditorStore((s) => s.prepareExport);
  const openHistoryPanel = useUiStore((s) => s.openHistoryPanel);
  const openExportDialog = useUiStore((s) => s.openExportDialog);
  const fileName = useEditorStore((s) => s.fileName);
  const hasDoc = useEditorStore((s) => s.documentHtml.length > 0);
  const historyCount = useEditorStore((s) => s.history.length);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-background)] px-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)] text-xs font-bold tracking-tighter">
              wh
            </span>
            <span className="text-sm font-semibold tracking-tight">wordhtml</span>
          </Link>
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
          <ThemeToggle />
          <button
            type="button"
            onClick={openHistoryPanel}
            title="ประวัติเอกสาร"
            aria-label="ประวัติเอกสาร"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
          >
            <Clock className="size-4" />
            {historyCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[9px] font-bold text-[color:var(--color-accent-foreground)]"
                aria-label={`จำนวนเอกสาร (Document count) ${historyCount}`}
              >
                {historyCount > 9 ? "9+" : historyCount}
              </span>
            )}
          </button>
          <UploadButton />
          <Button
            size="sm"
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
      <HistoryPanel />
    </>
  );
}
