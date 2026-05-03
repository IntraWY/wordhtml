"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { TopBar } from "./TopBar";
import { MenuBar } from "./MenuBar";
import { Ruler } from "./Ruler";
import { VisualEditor } from "./VisualEditor";
import { FormattingToolbar } from "./FormattingToolbar";
import { ExportDialog } from "./ExportDialog";
import { SearchPanel } from "./SearchPanel";
import { PageSetupDialog } from "./PageSetupDialog";
import { TemplatePanel } from "./TemplatePanel";
import { VariablePanel } from "./VariablePanel";
import { PreviewToggle } from "./PreviewToggle";
import { MultiPagePreview } from "./MultiPagePreview";
import { Toast } from "./Toast";
import { processTemplate } from "@/lib/templateEngine";
import { MobileBlock } from "@/components/MobileBlock";
import { useEditorStore } from "@/store/editorStore";
import { useTemplateStore } from "@/store/templateStore";
import { cn } from "@/lib/utils";
import { A4, LETTER, mmToPx } from "@/lib/page";

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
  const [currentIndent, setCurrentIndent] = useState({ marginLeft: 0, textIndent: 0 });

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
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const templateMode = useEditorStore((s) => s.templateMode);
  const previewMode = useEditorStore((s) => s.previewMode);
  const variables = useEditorStore((s) => s.variables);
  const dataSet = useEditorStore((s) => s.dataSet);
  const documentHtml = useEditorStore((s) => s.documentHtml);

  // Custom-event bridge between menu components and shell
  useEffect(() => {
    const onSearch = () => setSearchOpen(true);
    const onPageSetup = () => setPageSetupOpen(true);
    const onTemplates = () => useTemplateStore.getState().openPanel();
    const onInsertVariable = (e: Event) => {
      const name = (e as CustomEvent).detail as string;
      if (!editor || !name) return;
      const { state } = editor;
      const pos = state.selection.from;
      const mark = state.schema.marks.variable.create({ name });
      const text = state.schema.text(`{{${name}}}`, [mark]);
      editor.view.dispatch(state.tr.insert(pos, text));
      editor.commands.focus();
    };
    window.addEventListener("wordhtml:open-search", onSearch);
    window.addEventListener("wordhtml:open-page-setup", onPageSetup);
    window.addEventListener("wordhtml:open-templates", onTemplates);
    window.addEventListener("wordhtml:insert-variable", onInsertVariable);
    return () => {
      window.removeEventListener("wordhtml:open-search", onSearch);
      window.removeEventListener("wordhtml:open-page-setup", onPageSetup);
      window.removeEventListener("wordhtml:open-templates", onTemplates);
      window.removeEventListener("wordhtml:insert-variable", onInsertVariable);
    };
  }, [editor]);

  // Cross-tab sync: rehydrate stores when localStorage changes in another tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wordhtml-editor") {
        (useEditorStore as unknown as { persist?: { rehydrate: () => void } }).persist?.rehydrate?.();
      }
      if (e.key === "wordhtml-templates") {
        (useTemplateStore as unknown as { persist?: { rehydrate: () => void } }).persist?.rehydrate?.();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Skip shortcuts when user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

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

  // Track current paragraph indent for ruler triangles
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const attrs = editor.getAttributes("paragraph");
      setCurrentIndent({
        marginLeft: (attrs.marginLeft as number) ?? 0,
        textIndent: (attrs.textIndent as number) ?? 0,
      });
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  const handleIndentChange = useCallback(
    (marginLeft: number, textIndent: number) => {
      editor?.commands.setIndent(marginLeft, textIndent);
    },
    [editor]
  );

  const processedHtml = useMemo(() => {
    if (previewMode !== "preview" || !templateMode) return "";
    const dataRow = dataSet?.rows[dataSet.currentRowIndex] ?? {};
    const variableFallback = Object.fromEntries(
      variables.map((v) => [v.name, v.isList ? (v.listValues ?? []).join(", ") : v.value])
    );
    const mergedRow = { ...variableFallback, ...dataRow };
    return processTemplate(documentHtml, variables, mergedRow).html;
  }, [previewMode, templateMode, documentHtml, variables, dataSet]);

  // Count pages from page breaks in the document
  const pageCount = useMemo(() => {
    if (!documentHtml) return 1;
    // Match only divs with class="page-break" (avoid false positives like no-page-break)
    const breaks = (documentHtml.match(/<div[^>]*\sclass=["'][^"']*\bpage-break\b[^"']*["'][^>]*>/gi) || []).length;
    return breaks + 1;
  }, [documentHtml]);

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

  const base = pageSetup.size === "Letter" ? LETTER : A4;
  const isLandscape = pageSetup.orientation === "landscape";
  const widthMm = isLandscape ? base.hMm : base.wMm;
  const heightMm = isLandscape ? base.wMm : base.hMm;
  const widthPx = Math.round(mmToPx(widthMm));
  const heightPx = Math.round(mmToPx(heightMm));
  const marginTopPx = Math.round(mmToPx(pageSetup.marginMm.top));
  const marginRightPx = Math.round(mmToPx(pageSetup.marginMm.right));
  const marginBottomPx = Math.round(mmToPx(pageSetup.marginMm.bottom));
  const marginLeftPx = Math.round(mmToPx(pageSetup.marginMm.left));

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
        <div className="flex flex-1 overflow-hidden">
          <div
            className={cn(
              "grid flex-1 gap-px overflow-hidden bg-[color:var(--color-border)]",
              sourceOpen ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            <div className="flex min-h-0 flex-col overflow-hidden">
              {editor && previewMode !== "preview" && <FormattingToolbar editor={editor} />}
              {templateMode && (
                <div className="shrink-0 flex justify-center border-b border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5">
                  <PreviewToggle />
                </div>
              )}
              <div className="flex-1 overflow-auto bg-[color:var(--color-muted)] p-8">
                {previewMode === "preview" && templateMode ? (
                  <div className="mx-auto" style={{ width: widthPx }}>
                    <MultiPagePreview html={processedHtml} pageSetup={pageSetup} />
                  </div>
                ) : (
                  <div className="mx-auto" style={{ width: widthPx + 18 }}>
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `18px ${widthPx}px`,
                        gridTemplateRows: `18px auto`,
                      }}
                    >
                      <div className="border-b border-r border-[color:var(--color-border)] bg-[color:var(--color-muted)]" />
                      <Ruler
                        orientation="horizontal"
                        cm={widthMm / 10}
                        marginStart={marginLeftPx}
                        marginEnd={marginRightPx}
                        indentLeft={currentIndent.marginLeft}
                        indentFirst={currentIndent.textIndent}
                        onIndentChange={handleIndentChange}
                      />
                      <Ruler
                        orientation="vertical"
                        cm={heightMm / 10}
                        marginStart={marginTopPx}
                        marginEnd={marginBottomPx}
                      />
                      <article
                        className="paper printable-paper bg-white shadow-sm"
                        style={{
                          minHeight: heightPx,
                          width: widthPx,
                          paddingTop: marginTopPx,
                          paddingRight: marginRightPx,
                          paddingBottom: marginBottomPx,
                          paddingLeft: marginLeftPx,
                        }}
                      >
                        <VisualEditor onEditorReady={setEditor} />
                      </article>
                    </div>
                  </div>
                )}
              </div>
              {/* Status bar */}
              <div
                className="flex shrink-0 items-center justify-between border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-4 py-1 text-[11px] text-[color:var(--color-muted-foreground)]"
                aria-live="polite"
                aria-atomic="true"
              >
                <span>{pageCount} หน้า (Pages)</span>
                <span className="text-[color:var(--color-border-strong)]">
                  Ctrl+Enter / Cmd+Enter = ตัวแบ่งหน้า
                </span>
              </div>
            </div>
            {sourceOpen && <SourcePane />}
          </div>
          {templateMode && <VariablePanel />}
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
