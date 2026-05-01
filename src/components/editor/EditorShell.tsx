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
import { SearchPanel } from "./SearchPanel";
import { PageSetupDialog } from "./PageSetupDialog";
import { TemplatePanel } from "./TemplatePanel";
import { Toast } from "./Toast";
import { MobileBlock } from "@/components/MobileBlock";
import { useEditorStore } from "@/store/editorStore";
import { useTemplateStore } from "@/store/templateStore";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [pageSetupOpen, setPageSetupOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const loadError = useEditorStore((s) => s.loadError);
  const clearError = useEditorStore((s) => s.clearError);
  const lastLoadWarnings = useEditorStore((s) => s.lastLoadWarnings);
  const clearLoadWarnings = useEditorStore((s) => s.clearLoadWarnings);
  const openExportDialog = useEditorStore((s) => s.openExportDialog);
  const triggerFileOpen = useEditorStore((s) => s.triggerFileOpen);
  const saveSnapshot = useEditorStore((s) => s.saveSnapshot);
  const reset = useEditorStore((s) => s.reset);
  const loadFile = useEditorStore((s) => s.loadFile);
  const hasDoc = useEditorStore((s) => s.documentHtml.length > 0);
  const sourceOpen = useEditorStore((s) => s.sourceOpen);
  const previewOpen = useEditorStore((s) => s.previewOpen);

  // Custom-event bridge between menu components and shell
  useEffect(() => {
    const onSearch = () => setSearchOpen(true);
    const onPageSetup = () => setPageSetupOpen(true);
    const onTemplates = () => useTemplateStore.getState().openPanel();
    window.addEventListener("wordhtml:open-search", onSearch);
    window.addEventListener("wordhtml:open-page-setup", onPageSetup);
    window.addEventListener("wordhtml:open-templates", onTemplates);
    return () => {
      window.removeEventListener("wordhtml:open-search", onSearch);
      window.removeEventListener("wordhtml:open-page-setup", onPageSetup);
      window.removeEventListener("wordhtml:open-templates", onTemplates);
    };
  }, []);

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

      // Ctrl+Shift+S → Save snapshot (no dialog). Must be checked BEFORE
      // the plain Ctrl+S branch so it doesn't double-trigger.
      if (key === "s" && event.shiftKey) {
        event.preventDefault();
        saveSnapshot();
        return;
      }

      // Ctrl+Shift+N → New document (reset)
      if (key === "n" && event.shiftKey) {
        event.preventDefault();
        reset();
        return;
      }

      // Ctrl+S → Save snapshot + open export dialog (existing behavior)
      if (key === "s" && !event.shiftKey) {
        event.preventDefault();
        if (hasDoc) {
          saveSnapshot();
          openExportDialog();
        }
        return;
      }

      // Ctrl+O → Open file
      if (key === "o") {
        event.preventDefault();
        triggerFileOpen();
        return;
      }

      // Ctrl+F → Toggle search panel
      if (key === "f" && !event.shiftKey) {
        event.preventDefault();
        setSearchOpen((s) => !s);
        return;
      }

      // Ctrl+K → Insert link
      if (key === "k") {
        event.preventDefault();
        const url = window.prompt("ใส่ URL ของลิงก์:");
        if (url && editor) {
          editor.chain().focus().setLink({ href: url }).run();
        }
        return;
      }

      // Ctrl+P → Print
      if (key === "p") {
        event.preventDefault();
        window.print();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openExportDialog, saveSnapshot, hasDoc, triggerFileOpen, reset, editor]);

  // beforeunload warning when document has unsaved changes (current HTML
  // differs from the most-recent snapshot in history).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const state = useEditorStore.getState();
      const html = state.documentHtml.trim();
      if (!html) return;
      const lastHistory = state.history[0];
      if (lastHistory && lastHistory.html === state.documentHtml) return;
      e.preventDefault();
      // legacy browsers need a returnValue
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const rightPane = sourceOpen ? (
    <SourcePane />
  ) : previewOpen ? (
    <A4Preview />
  ) : null;

  const gridCols = rightPane ? "grid-cols-2" : "grid-cols-1";

  return (
    <>
      <div
        className={cn(
          "relative flex h-screen flex-col",
          isFullscreen && "fixed inset-0 z-50 overflow-auto bg-[color:var(--color-background)]"
        )}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setIsDragging(true);
          }
        }}
        onDragLeave={(e) => {
          // Only set false if we leave the actual element (not children)
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) loadFile(file);
        }}
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

        {isDragging && (
          <div className="pointer-events-none absolute inset-4 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-[color:var(--color-accent)] bg-[color:var(--color-background)]/80 text-lg font-semibold text-[color:var(--color-accent)]">
            วางไฟล์ที่นี่เพื่ออัปโหลด
          </div>
        )}

        <ExportDialog />
        <TemplatePanel />
        <Toast />
        <SearchPanel
          editor={editor}
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
        <PageSetupDialog
          open={pageSetupOpen}
          onClose={() => setPageSetupOpen(false)}
        />
        <MobileBlock />
      </div>
    </>
  );
}
