"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

import { TopBar } from "./TopBar";
import { CleaningToolbar } from "./CleaningToolbar";
import { VisualEditor } from "./VisualEditor";
import { A4Preview } from "./A4Preview";
import { ExportDialog } from "./ExportDialog";
import { MobileBlock } from "@/components/MobileBlock";
import { useEditorStore } from "@/store/editorStore";

export function EditorShell() {
  const loadError = useEditorStore((s) => s.loadError);
  const clearError = useEditorStore((s) => s.clearError);
  const openExportDialog = useEditorStore((s) => s.openExportDialog);
  const saveSnapshot = useEditorStore((s) => s.saveSnapshot);
  const hasDoc = useEditorStore((s) => s.documentHtml.length > 0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openExportDialog, saveSnapshot, hasDoc]);

  return (
    <div className="flex h-screen flex-col">
      <TopBar />
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
      <div className="grid flex-1 grid-cols-2 gap-px overflow-hidden bg-[color:var(--color-border)]">
        <VisualEditor />
        <A4Preview />
      </div>
      <ExportDialog />
      <MobileBlock />
    </div>
  );
}
