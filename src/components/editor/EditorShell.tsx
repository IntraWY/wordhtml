"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, X, Loader2, FileUp, Image as ImageIcon, FileText } from "lucide-react";
import { StatusBar } from "./StatusBar";
import type { Editor } from "@tiptap/react";

import { TopBar } from "./TopBar";
import { Ribbon } from "./ribbon/Ribbon";
import { MobileToolbar } from "./MobileToolbar";
import { Ruler } from "./Ruler";
import { VisualEditor } from "./VisualEditor";
import { PreviewToggle } from "./PreviewToggle";
import { VariablePanel } from "./VariablePanel";
import { IndentRuler } from "./IndentRuler";
import { TemplatePreview } from "./TemplatePreview";
import { SourcePane } from "./SourcePane";
import { usePaginationStore } from "@/store/paginationStore";
import { useEditorStore } from "@/store/editorStore";
import { useTemplateStore } from "@/store/templateStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { A4, LETTER, mmToPx } from "@/lib/page";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { useEditorResize } from "@/hooks/useEditorResize";
import { useAutoPagination } from "@/hooks/useAutoPagination";
import { useVirtualScroll } from "@/hooks/useVirtualScroll";
import { DialogManager } from "./DialogManager";
import { ParagraphDialog } from "./ParagraphDialog";
import { MathInputDialog } from "./MathInputDialog";
import { MobileBlock } from "@/components/MobileBlock";
import { addEventListener, removeEventListener } from "@/lib/events";
import { PaginationManager } from "./PaginationManager";
import { PageBreakIndicator } from "./PageBreakIndicator";
import { ParagraphContextMenu } from "./ParagraphContextMenu";
import { Tour } from "@/components/onboarding/Tour";

export function EditorShell() {
  const editorRef = useRef<Editor | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rulerInfo, setRulerInfo] = useState<{ label: string } | null>(null);

  const onEditorReady = useCallback((ed: Editor | null) => {
    if (editorRef.current === ed) return;
    editorRef.current = ed;
    setEditor(ed);
  }, []);

  const loadError = useEditorStore((s) => s.loadError);
  const clearError = useEditorStore((s) => s.clearError);
  const lastLoadWarnings = useEditorStore((s) => s.lastLoadWarnings);
  const clearLoadWarnings = useEditorStore((s) => s.clearLoadWarnings);
  const isLoadingFile = useEditorStore((s) => s.isLoadingFile);
  const sourceOpen = useUiStore((s) => s.sourceOpen);
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const setPageSetup = useEditorStore((s) => s.setPageSetup);
  const templateMode = useEditorStore((s) => s.templateMode);
  const previewMode = useEditorStore((s) => s.previewMode);
  const documentHtml = useEditorStore((s) => s.documentHtml);

  const isFullscreen = useUiStore((s) => s.fullscreen);
  const openSearch = useUiStore((s) => s.openSearch);
  const openPageSetup = useUiStore((s) => s.openPageSetup);
  const openShortcuts = useUiStore((s) => s.openShortcuts);
  const openToc = useUiStore((s) => s.openToc);
  const openHeaderFooter = useUiStore((s) => s.openHeaderFooter);
  const paragraphOpen = useUiStore((s) => s.paragraphOpen);
  const closeParagraph = useUiStore((s) => s.closeParagraph);
  const [mathOpen, setMathOpen] = useState(false);

  /* consolidated hooks */
  useKeyboardShortcuts(editor);
  useBeforeUnload();
  const { articleRef, contentHeight } = useEditorResize();
  const { totalPages, currentPage, setCurrentPage, pageBreaks } = useAutoPagination(
    articleRef,
    pageSetup,
    undefined,
    [documentHtml, pageSetup]
  );
  const { visiblePages, isActive: virtualScrollActive, containerRef: virtualScrollContainerRef } = useVirtualScroll(pageBreaks, { overscan: 1, threshold: 5 });
  const { onDragOver, onDragLeave, onDrop } = useDragAndDrop(editor, setIsDragging);

  /* custom-event bridge between menu components and shell */
  useEffect(() => {
    const onSearch = () => openSearch();
    const onPageSetup = () => openPageSetup();
    const onShortcuts = () => openShortcuts();
    const onToc = () => openToc();
    const onHeaderFooter = () => openHeaderFooter();
    const onTemplates = () => useTemplateStore.getState().openPanel();
    const onPageNext = () => usePaginationStore.getState().nextPage();
    const onPagePrev = () => usePaginationStore.getState().prevPage();
    const onInsertVariable = (e: CustomEvent) => {
      const name = e.detail as string;
      const ed = editorRef.current;
      if (!ed || !name) return;
      const { state } = ed;
      const pos = state.selection.from;
      const mark = state.schema.marks.variable.create({ name });
      const text = state.schema.text(`{{${name}}}`, [mark]);
      ed.view.dispatch(state.tr.insert(pos, text));
      ed.commands.focus();
    };
    const onOpenMath = () => setMathOpen(true);
    addEventListener("wordhtml:open-search", onSearch);
    addEventListener("wordhtml:open-page-setup", onPageSetup);
    addEventListener("wordhtml:open-shortcuts", onShortcuts);
    addEventListener("wordhtml:open-toc", onToc);
    addEventListener("wordhtml:open-header-footer", onHeaderFooter);
    addEventListener("wordhtml:open-templates", onTemplates);
    addEventListener("wordhtml:page-next", onPageNext);
    addEventListener("wordhtml:page-prev", onPagePrev);
    addEventListener("wordhtml:insert-variable", onInsertVariable);
    window.addEventListener("wordhtml:open-math-dialog", onOpenMath);
    return () => {
      removeEventListener("wordhtml:open-search", onSearch);
      removeEventListener("wordhtml:open-page-setup", onPageSetup);
      removeEventListener("wordhtml:open-shortcuts", onShortcuts);
      removeEventListener("wordhtml:open-toc", onToc);
      removeEventListener("wordhtml:open-header-footer", onHeaderFooter);
      removeEventListener("wordhtml:open-templates", onTemplates);
      removeEventListener("wordhtml:page-next", onPageNext);
      removeEventListener("wordhtml:page-prev", onPagePrev);
      removeEventListener("wordhtml:insert-variable", onInsertVariable);
      window.removeEventListener("wordhtml:open-math-dialog", onOpenMath);
    };
  }, [openSearch, openPageSetup, openShortcuts, openToc, openHeaderFooter]);

  /* cross-tab sync: rehydrate stores when localStorage changes in another tab */
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

  const handleVerticalMarginChange = useCallback(
    (topMm: number, bottomMm: number) => {
      setPageSetup({
        marginMm: {
          top: topMm,
          right: pageSetup.marginMm.right,
          bottom: bottomMm,
          left: pageSetup.marginMm.left,
        },
      });
    },
    [pageSetup, setPageSetup]
  );

  const handleRulerActive = useCallback(
    (info: { label: string } | null) => {
      setRulerInfo(info);
    },
    []
  );

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
      <a
        href="#editor-content"
        className="sr-only absolute left-2 top-2 z-[100] rounded-md bg-[color:var(--color-foreground)] px-3 py-2 text-sm font-medium text-[color:var(--color-background)] shadow-lg focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)]"
      >
        ข้ามไปยังเนื้อหา (Skip to content)
      </a>
      <div
        className={cn(
          "relative flex h-screen flex-col",
          isFullscreen && "fixed inset-0 z-50 overflow-auto bg-[color:var(--color-background)]"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <TopBar />
        <div className="hidden md:block">
          <Ribbon editor={editor} />
        </div>
        <MobileToolbar editor={editor} />
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
              {templateMode && (
                <div className="shrink-0 flex justify-center border-b border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5">
                  <PreviewToggle />
                </div>
              )}
              <div ref={virtualScrollContainerRef} className="flex-1 overflow-auto bg-[color:var(--color-muted)] p-8">
                {previewMode === "preview" && templateMode ? (
                  <TemplatePreview widthPx={widthPx} />
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
                      <IndentRuler
                        editor={editor}
                        cm={widthMm / 10}
                        marginStart={marginLeftPx}
                        marginEnd={marginRightPx}
                        marginLeftMm={pageSetup.marginMm.left}
                        marginRightMm={pageSetup.marginMm.right}
                        onMarginChange={handleMarginChange}
                        onRulerActive={handleRulerActive}
                      />
                      <Ruler
                        orientation="vertical"
                        cm={heightMm / 10}
                        marginStart={marginTopPx}
                        marginEnd={marginBottomPx}
                        marginTopMm={pageSetup.marginMm.top}
                        marginBottomMm={pageSetup.marginMm.bottom}
                        onMarginChange={handleVerticalMarginChange}
                        onRulerActive={handleRulerActive}
                        contentHeight={contentHeight > 0 ? contentHeight : undefined}
                      />
                      <div className="relative" data-tour="editor">
                        <PageBreakIndicator pageBreaks={pageBreaks} />
                        <article
                          id="editor-content"
                          ref={articleRef}
                          className={cn("paper printable-paper", virtualScrollActive && "page-virtual")}
                          style={{
                            minHeight: heightPx,
                            width: widthPx,
                            paddingTop: marginTopPx,
                            paddingRight: marginRightPx,
                            paddingBottom: marginBottomPx,
                            paddingLeft: marginLeftPx,
                            /* dynamic intrinsic size per page when virtual scroll is active */
                            containIntrinsicSize: virtualScrollActive
                              ? `${widthPx}px ${heightPx}px`
                              : undefined,
                          }}
                        >
                          <VisualEditor onEditorReady={onEditorReady} visiblePages={visiblePages} virtualScrollActive={virtualScrollActive} />
                        </article>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center justify-between border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
                <StatusBar rulerInfo={rulerInfo} />
                <PaginationManager totalPages={totalPages} currentPage={currentPage} onPageChange={setCurrentPage} />
              </div>
            </div>
            {sourceOpen && <SourcePane />}
          </div>
          {templateMode && <VariablePanel />}
        </div>

        {isDragging && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[color:var(--color-background)]/70 backdrop-blur-[2px]">
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
            <div
              role="status"
              aria-live="polite"
              aria-label="กำลังโหลด (Loading)"
              className="flex items-center gap-3 rounded-xl bg-[color:var(--color-background)] px-6 py-4 shadow-xl border border-[color:var(--color-border)]"
            >
              <Loader2 className="size-5 animate-spin text-[color:var(--color-accent)]" />
              <span className="text-sm font-medium text-[color:var(--color-foreground)]">กำลังโหลดไฟล์…</span>
            </div>
          </div>
        )}

        <DialogManager editor={editor} />
        <ParagraphDialog open={paragraphOpen} onClose={closeParagraph} editor={editor} />
        <MathInputDialog open={mathOpen} onClose={() => setMathOpen(false)} editor={editor} />
        <ParagraphContextMenu editor={editor} containerRef={articleRef} />
        <MobileBlock />
        <Tour />
      </div>
    </>
  );
}
