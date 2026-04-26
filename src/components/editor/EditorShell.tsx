"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { TopBar } from "./TopBar";
import { MenuBar } from "./MenuBar";
import { CleaningToolbar } from "./CleaningToolbar";
import { VisualEditor } from "./VisualEditor";
import { A4Preview } from "./A4Preview";
import { ExportDialog } from "./ExportDialog";
import { MobileBlock } from "@/components/MobileBlock";
import { useEditorStore } from "@/store/editorStore";
import { cn } from "@/lib/utils";

function SourcePane() {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const setHtml = useEditorStore((s) => s.setHtml);
  return (
    <div className="flex flex-col overflow-hidden bg-[color:var(--color-background)]">
      <div
        id="source-pane-label"
        className="shrink-0 border-b border-[color:var(--color-border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]"
      >
        ซอร์ส HTML
      </div>
      <textarea
        aria-label="ซอร์ส HTML"
        aria-labelledby="source-pane-label"
        className="flex-1 resize-none p-4 font-mono text-xs leading-relaxed text-[color:var(--color-foreground)] outline-none"
        value={documentHtml}
        onChange={(e) => setHtml(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}

export function EditorShell() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loadError = useEditorStore((s) => s.loadError);
  const clearError = useEditorStore((s) => s.clearError);
  const lastLoadWarnings = useEditorStore((s) => s.lastLoadWarnings);
  const clearLoadWarnings = useEditorStore((s) => s.clearLoadWarnings);
  const openExportDialog = useEditorStore((s) => s.openExportDialog);
  const triggerFileOpen = useEditorStore((s) => s.triggerFileOpen);
  const saveSnapshot = useEditorStore((s) => s.saveSnapshot);
  const hasDoc = useEditorStore((s) => s.documentHtml.length > 0);
  const sourceOpen = useEditorStore((s) => s.sourceOpen);
  const previewOpen = useEditorStore((s) => s.previewOpen);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F11") {
        event.preventDefault();
        setIsFullscreen((f) => !f);
        return;
      }
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        if (hasDoc) {
          saveSnapshot();
          openExportDialog();
        }
      }
      if (key === "o") {
        event.preventDefault();
        triggerFileOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openExportDialog, saveSnapshot, hasDoc, triggerFileOpen]);

  const rightPane = sourceOpen ? (
    <SourcePane />
  ) : previewOpen ? (
    <A4Preview />
  ) : null;

  const gridCols = rightPane
    ? "grid-cols-2"
    : "grid-cols-1";

  return (
    <>
      <div
        className={cn(
          "flex h-screen flex-col",
          isFullscreen && "fixed inset-0 z-50 overflow-auto bg-[color:var(--color-background)]"
        )}
      >
        <TopBar />
        <MenuBar
          editor={editor}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((f) => !f)}
        />
        <CleaningToolbar />
        {loadError && (
          <div
            role="alert"
            className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--color-border)] bg-red-50 px-5 py-2.5 text-sm text-red-900"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{loadError}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              aria-label="ปิดข้อความผิดพลาด"
              className="rounded-md p-1 text-red-700 transition-colors hover:bg-red-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        {lastLoadWarnings.length > 0 && (
          <div
            role="status"
            className="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--color-border)] bg-amber-50 px-5 py-2.5 text-sm text-amber-900"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>
                พบคำเตือน {lastLoadWarnings.length} รายการขณะโหลดไฟล์
                {lastLoadWarnings[0]?.message && ` — ${lastLoadWarnings[0].message}`}
                {lastLoadWarnings.length > 1 && ` (และอีก ${lastLoadWarnings.length - 1})`}
              </span>
            </div>
            <button
              type="button"
              onClick={clearLoadWarnings}
              aria-label="ปิดคำเตือน"
              className="rounded-md p-1 text-amber-700 transition-colors hover:bg-amber-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <div
          className={cn(
            "grid flex-1 gap-px overflow-hidden bg-[color:var(--color-border)]",
            gridCols
          )}
        >
          <VisualEditor onEditorReady={setEditor} />
          {rightPane}
        </div>
        <ExportDialog />
        <MobileBlock />
      </div>
    </>
  );
}
