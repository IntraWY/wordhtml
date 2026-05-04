"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, X, Loader2, FileUp, Image as ImageIcon, FileText } from "lucide-react";
import { StatusBar } from "./StatusBar";
import { ShortcutsPanel } from "./ShortcutsPanel";
import { TableOfContentsPanel } from "./TableOfContentsPanel";
import type { Editor } from "@tiptap/react";

import { TopBar } from "./TopBar";
import { MenuBar } from "./MenuBar";
import { Ruler } from "./Ruler";
import { VisualEditor } from "./VisualEditor";
import { FormattingToolbar } from "./FormattingToolbar";
import { ExportDialog } from "./ExportDialog";
import { BatchUploadDialog } from "./BatchUploadDialog";
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
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/utils";
import { A4, LETTER, mmToPx } from "@/lib/page";
import { compressImageIfEnabled, readFileAsDataURL } from "@/lib/imageCompression";

function SourcePane() {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const isLoadingFile = useEditorStore((s) => s.isLoadingFile);
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentIndent, setCurrentIndent] = useState({ marginLeft: 0, textIndent: 0 });
  const [contentHeight, setContentHeight] = useState<number>(0);
  const articleRef = useRef<HTMLElement>(null);

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
  const setPageSetup = useEditorStore((s) => s.setPageSetup);
  const templateMode = useEditorStore((s) => s.templateMode);
  const previewMode = useEditorStore((s) => s.previewMode);
  const variables = useEditorStore((s) => s.variables);
  const dataSet = useEditorStore((s) => s.dataSet);
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const isLoadingFile = useEditorStore((s) => s.isLoadingFile);

  // Custom-event bridge between menu components and shell
  useEffect(() => {
    const onSearch = () => setSearchOpen(true);
    const onPageSetup = () => setPageSetupOpen(true);
    const onShortcuts = () => setShortcutsOpen(true);
    const onToc = () => setTocOpen(true);
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
    window.addEventListener("wordhtml:open-shortcuts", onShortcuts);
    window.addEventListener("wordhtml:open-toc", onToc);
    window.addEventListener("wordhtml:open-templates", onTemplates);
    window.addEventListener("wordhtml:insert-variable", onInsertVariable);
    return () => {
      window.removeEventListener("wordhtml:open-search", onSearch);
      window.removeEventListener("wordhtml:open-page-setup", onPageSetup);
      window.removeEventListener("wordhtml:open-shortcuts", onShortcuts);
      window.removeEventListener("wordhtml:open-toc", onToc);
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
      if (event.key === "F1") {
        event.preventDefault();
        setShortcutsOpen(true);
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

  const handleMarginChange = useCallback(
    (leftMm: number, rightMm: number) => {
      setPageSetup({
        marginMm: {
          top: pageSetup.marginMm.top,
          right: rightMm,
          bottom: pageSetup.marginMm.bottom,
          left: leftMm,
        },
      });
    },
    [pageSetup, setPageSetup]
  );

  // Observe article height so vertical ruler can extend beyond one page
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use borderBoxSize to include padding (matches visual height)
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.clientHeight;
        setContentHeight(h);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [documentHtml]);

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
        onDrop={async (e) => {
          e.preventDefault();
          setIsDragging(false);
          const files = Array.from(e.dataTransfer.files ?? []);
          const images = files.filter((f) => f.type.startsWith("image/"));
          const others = files.filter((f) => !f.type.startsWith("image/"));

          if (images.length > 0 && editor) {
            const autoCompress = useEditorStore.getState().autoCompressImages;
            let inserted = 0;
            for (const file of images) {
              try {
                const finalFile = await compressImageIfEnabled(file, autoCompress);
                const src = await readFileAsDataURL(finalFile);
                editor.chain().focus().setImage({ src, alt: finalFile.name }).run();
                inserted++;
              } catch {
                try {
                  const src = await readFileAsDataURL(file);
                  editor.chain().focus().setImage({ src, alt: file.name }).run();
                  inserted++;
                } catch {
                  useToastStore.getState().show(`ไม่สามารถแทรกรูป ${file.name}`, "error");
                }
              }
            }
            if (inserted > 0) {
              useToastStore.getState().show(`แทรกรูปภาพ ${inserted} รายการแล้ว`, "success");
            }
          }

          if (others.length > 0) {
            const file = others[0];
            await loadFile(file);
            useToastStore.getState().show(`โหลดไฟล์ ${file.name} แล้ว`, "success");
          }
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
                        marginLeftMm={pageSetup.marginMm.left}
                        marginRightMm={pageSetup.marginMm.right}
                        onMarginChange={handleMarginChange}
                      />
                      <Ruler
                        orientation="vertical"
                        cm={heightMm / 10}
                        marginStart={marginTopPx}
                        marginEnd={marginBottomPx}
                        contentHeight={contentHeight > 0 ? contentHeight : undefined}
                      />
                      <article
                        ref={articleRef}
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
              <StatusBar pageCount={pageCount} />
            </div>
            {sourceOpen && <SourcePane />}
          </div>
          {templateMode && <VariablePanel />}
        </div>

        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[color:var(--color-background)]/70 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-[color:var(--color-accent)] bg-[color:var(--color-background)] px-10 py-8 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--color-muted)]">
                  <FileUp className="size-6 text-[color:var(--color-accent)]" />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--color-muted)]">
                  <ImageIcon className="size-6 text-[color:var(--color-accent)]" />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--color-muted)]">
                  <FileText className="size-6 text-[color:var(--color-accent)]" />
                </div>
              </div>
              <p className="text-lg font-semibold text-[color:var(--color-accent)]">
                วางไฟล์ที่นี่เพื่ออัปโหลด
              </p>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                รองรับ .docx, .html, .md และรูปภาพ
              </p>
            </div>
          </div>
        )}

        {isLoadingFile && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[color:var(--color-background)]/60 backdrop-blur-[1px]">
            <div className="flex items-center gap-3 rounded-xl bg-[color:var(--color-background)] px-6 py-4 shadow-xl border border-[color:var(--color-border)]">
              <Loader2 className="size-5 animate-spin text-[color:var(--color-accent)]" />
              <span className="text-sm font-medium text-[color:var(--color-foreground)]">กำลังโหลดไฟล์…</span>
            </div>
          </div>
        )}

        <ExportDialog />
        <BatchUploadDialog />
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
        <ShortcutsPanel
          open={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
        />
        <TableOfContentsPanel
          editor={editor}
          open={tocOpen}
          onClose={() => setTocOpen(false)}
        />
        <MobileBlock />
      </div>
    </>
  );
}
