"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, X, Loader2, FileUp, Image as ImageIcon, FileText } from "lucide-react";
import { StatusBar } from "./StatusBar";
import type { Editor } from "@tiptap/react";

import { TopBar } from "./TopBar";
import { Ribbon } from "./ribbon/Ribbon";
import { MobileToolbar } from "./MobileToolbar";
import { Ruler } from "./Ruler";
import { VisualEditor } from "./VisualEditor";
import { PageCanvas } from "./PageCanvas";
import { PreviewToggle } from "./PreviewToggle";
import { VariablePanel } from "./VariablePanel";
import { VariableFillPopover } from "./VariableFillPopover";
import { FieldFillPopover } from "./FieldFillPopover";
import { IndentRuler } from "./IndentRuler";
import { EditorRulerBar, EditorPaperScrollBody } from "./EditorPaperLayout";
import { TabTypeSelector } from "./TabTypeSelector";
import { TemplatePreview } from "./TemplatePreview";
import { SourcePane } from "./SourcePane";
import { useEditorStore } from "@/store/editorStore";
import { useTemplateStore } from "@/store/templateStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import {
  getPageDimensionsPx,
  mmToPx,
  PAGE_CANVAS_PADDING_PX,
} from "@/lib/page";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { useEditorResize } from "@/hooks/useEditorResize";
import { usePagination } from "@/hooks/usePagination";
import { DialogManager } from "./DialogManager";
import { MobileBlock } from "@/components/MobileBlock";
import { addEventListener, removeEventListener, EVENT_NAMES } from "@/lib/events";
import { unwrapPageNode } from "@/lib/unwrapPageNode";
import { normalizeImagePercentWidths } from "@/lib/imageScale";
import { measurePageBodyWidthFromDom } from "@/lib/pageContentWidth";
import { isLiveEditor } from "@/lib/editorLive";
import { insertVariableBadge } from "@/lib/tiptap/insertVariableBadge";
import { PaginationManager } from "./PaginationManager";
import { PageChromeLayer } from "./PageChromeLayer";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useCloudHistorySync } from "@/hooks/useCloudHistorySync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CloudConflictBanner } from "./CloudConflictBanner";

const ParagraphDialog = dynamic(
  () => import("./ParagraphDialog").then((m) => m.ParagraphDialog),
  { ssr: false, loading: () => null }
);
const MathInputDialog = dynamic(
  () => import("./MathInputDialog").then((m) => m.MathInputDialog),
  { ssr: false, loading: () => null }
);
const PlaceholderPanel = dynamic(
  () => import("./PlaceholderPanel").then((m) => m.PlaceholderPanel),
  { ssr: false, loading: () => null }
);
const EditorContextMenu = dynamic(
  () => import("./EditorContextMenu").then((m) => m.EditorContextMenu),
  { ssr: false, loading: () => null }
);
const Tour = dynamic(
  () => import("@/components/onboarding/Tour").then((m) => m.Tour),
  { ssr: false, loading: () => null }
);

export function EditorShell() {
  useFirebaseAuth();
  useOnlineStatus();
  useCloudHistorySync();
  const editorRef = useRef<Editor | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rulerInfo, setRulerInfo] = useState<{ label: string } | null>(null);

  const onEditorReady = useCallback((ed: Editor | null) => {
    if (ed === null || editorRef.current !== ed) {
      editorRef.current = ed;
      setEditor(ed);
    }
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
  const ribbonEditor =
    previewMode === "preview" && templateMode ? null : editor;

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [contentOffsetPx, setContentOffsetPx] = useState(PAGE_CANVAS_PADDING_PX);
  const [headerFooterReservePx, setHeaderFooterReservePx] = useState(0);
  const placeholderPanelOpen = useUiStore((s) => s.placeholderPanelOpen);
  const paginationEnabled =
    !(previewMode === "preview" && templateMode);
  const { pageCount, currentPage, goToPage } = usePagination(editor, pageSetup, {
    scrollContainerRef,
    headerFooterReservePx,
    enabled: paginationEnabled,
  });
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  const { onDragOver, onDragLeave, onDrop } = useDragAndDrop(editor, setIsDragging);

  /* Sync global pageSetup (ruler, ribbon, dialogs) into every page-node in the editor */
  useEffect(() => {
    if (!isLiveEditor(editor)) return;
    editor.commands.setDocumentPageSetup({
      size: pageSetup.size,
      orientation: pageSetup.orientation,
      marginMm: pageSetup.marginMm,
      // Always forward watermark (even undefined) so clearing it propagates.
      watermark: pageSetup.watermark,
      firstPageMarginMm: pageSetup.firstPageMarginMm,
      ...(pageSetup.headerFooter ? { headerFooter: pageSetup.headerFooter } : {}),
    });
  }, [editor, pageSetup]);

  /* custom-event bridge between menu components and shell */
  useEffect(() => {
    const onSearch = () => openSearch();
    const onPageSetup = () => openPageSetup();
    const onShortcuts = () => openShortcuts();
    const onToc = () => openToc();
    const onHeaderFooter = () => openHeaderFooter();
    const onTemplates = () => useTemplateStore.getState().openPanel();
    const onInsertVariable = (e: CustomEvent) => {
      const name = e.detail as string;
      const ed = editorRef.current;
      if (!isLiveEditor(ed) || !name) return;
      ed.chain().focus().run();
      insertVariableBadge(ed, ed.state.selection.from, name);
    };
    const onOpenMath = () => setMathOpen(true);
    const onPageNext = () => goToPage(currentPageRef.current + 1);
    const onPagePrev = () => goToPage(currentPageRef.current - 1);
    const onEnterPreview = () => {
      const ed = editorRef.current;
      if (isLiveEditor(ed)) {
        const pageSetup = useEditorStore.getState().pageSetup;
        const html = normalizeImagePercentWidths(
          unwrapPageNode(ed.getHTML()),
          pageSetup,
          measurePageBodyWidthFromDom()
        );
        useEditorStore.getState().setHtml(html);
      } else {
        useEditorStore.getState().flushDocumentHtml();
      }
    };
    addEventListener(EVENT_NAMES.enterPreview, onEnterPreview);
    addEventListener("wordhtml:open-search", onSearch);
    addEventListener("wordhtml:open-page-setup", onPageSetup);
    addEventListener("wordhtml:open-shortcuts", onShortcuts);
    addEventListener("wordhtml:open-toc", onToc);
    addEventListener("wordhtml:open-header-footer", onHeaderFooter);
    addEventListener("wordhtml:open-templates", onTemplates);
    addEventListener("wordhtml:insert-variable", onInsertVariable);
    addEventListener("wordhtml:page-next", onPageNext);
    addEventListener("wordhtml:page-prev", onPagePrev);
    window.addEventListener("wordhtml:open-math-dialog", onOpenMath);
    return () => {
      removeEventListener(EVENT_NAMES.enterPreview, onEnterPreview);
      removeEventListener("wordhtml:open-search", onSearch);
      removeEventListener("wordhtml:open-page-setup", onPageSetup);
      removeEventListener("wordhtml:open-shortcuts", onShortcuts);
      removeEventListener("wordhtml:open-toc", onToc);
      removeEventListener("wordhtml:open-header-footer", onHeaderFooter);
      removeEventListener("wordhtml:open-templates", onTemplates);
      removeEventListener("wordhtml:insert-variable", onInsertVariable);
      removeEventListener("wordhtml:page-next", onPageNext);
      removeEventListener("wordhtml:page-prev", onPagePrev);
      window.removeEventListener("wordhtml:open-math-dialog", onOpenMath);
    };
  }, [openSearch, openPageSetup, openShortcuts, openToc, openHeaderFooter, goToPage]);

  /* cross-tab sync: rehydrate stores when localStorage changes in another tab */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wordhtml-editor") {
        useEditorStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* Lock body scroll to the viewport while the editor is mounted.
     The only scroller is the inner overflow-auto container below.
     Class removed on unmount so other routes keep normal scrolling. */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("editor-locked");
    return () => {
      root.classList.remove("editor-locked");
    };
  }, []);

  const handleMarginChange = useCallback(
    (leftMm: number, rightMm: number) => {
      const { marginMm } = useEditorStore.getState().pageSetup;
      setPageSetup({ marginMm: { ...marginMm, left: leftMm, right: rightMm } });
    },
    [setPageSetup]
  );

  const handleVerticalMarginChange = useCallback(
    (topMm: number, bottomMm: number) => {
      const { marginMm } = useEditorStore.getState().pageSetup;
      setPageSetup({ marginMm: { ...marginMm, top: topMm, bottom: bottomMm } });
    },
    [setPageSetup]
  );

  const handleRulerActive = useCallback(
    (info: { label: string } | null) => {
      setRulerInfo(info);
    },
    []
  );

  const { widthPx, heightPx: pageHeightPx, widthMm, heightMm } =
    getPageDimensionsPx(pageSetup);
  const marginTopPx = Math.round(mmToPx(pageSetup.marginMm.top));
  const marginRightPx = Math.round(mmToPx(pageSetup.marginMm.right));
  const marginBottomPx = Math.round(mmToPx(pageSetup.marginMm.bottom));
  const marginLeftPx = Math.round(mmToPx(pageSetup.marginMm.left));

  useLayoutEffect(() => {
    if (previewMode === "preview" && templateMode) return;
    const canvas = articleRef.current;
    const pageNode = canvas?.querySelector(".page-node");
    if (!canvas || !pageNode) {
      setContentOffsetPx(PAGE_CANVAS_PADDING_PX);
      return;
    }
    const measured = Math.round(
      pageNode.getBoundingClientRect().top - canvas.getBoundingClientRect().top
    );
    setContentOffsetPx(measured > 0 ? measured : PAGE_CANVAS_PADDING_PX);
  }, [articleRef, contentHeight, pageCount, pageHeightPx, previewMode, templateMode]);

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
          isFullscreen && "fixed inset-0 z-50 overflow-hidden bg-[color:var(--color-background)]"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <TopBar />
        <CloudConflictBanner />
        <div className="hidden md:block">
          <Ribbon editor={ribbonEditor} />
        </div>
        <MobileToolbar editor={ribbonEditor} />
        {loadError && (
          <div
            role="alert"
            className="banner-danger flex shrink-0 items-center justify-between gap-3 border-b px-5 py-2.5 text-sm"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{loadError}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              aria-label="ปิดข้อความผิดพลาด"
              className="rounded-md p-1 text-current transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-danger)_12%,transparent)]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        {lastLoadWarnings.length > 0 && (
          <div
            role="status"
            className="banner-warning flex shrink-0 items-center justify-between gap-3 border-b px-5 py-2.5 text-sm"
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
              className="rounded-md p-1 text-current transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-warning)_12%,transparent)]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <main className="flex min-h-0 flex-1 overflow-hidden">
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
              {previewMode === "preview" && templateMode ? (
                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-auto bg-[color:var(--color-muted)] px-8 pb-8"
                  style={{ scrollbarGutter: "stable" }}
                >
                  <TemplatePreview
                    widthPx={widthPx}
                    headerFooterReservePx={headerFooterReservePx}
                  />
                </div>
              ) : (
                <div
                  ref={scrollContainerRef}
                  className="editor-desk flex-1 overflow-auto"
                  style={{ scrollbarGutter: "stable" }}
                >
                  <div className="sticky top-0 z-10 bg-[color:var(--color-canvas)] px-8 pt-8">
                    <EditorRulerBar
                      widthPx={widthPx}
                      cornerSlot={<TabTypeSelector />}
                      horizontalRuler={
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
                      }
                    />
                  </div>
                  <div className="px-8 pb-8">
                    <EditorPaperScrollBody
                      widthPx={widthPx}
                      verticalRuler={
                        <Ruler
                          orientation="vertical"
                          cm={heightMm / 10}
                          marginStart={marginTopPx}
                          marginEnd={marginBottomPx}
                          marginTopMm={pageSetup.marginMm.top}
                          marginBottomMm={pageSetup.marginMm.bottom}
                          onMarginChange={handleVerticalMarginChange}
                          onRulerActive={handleRulerActive}
                          pageHeightPx={pageHeightPx}
                          pageCount={pageCount}
                          contentOffsetPx={contentOffsetPx}
                        />
                      }
                    >
                      <div
                        id="editor-main"
                        tabIndex={-1}
                        className="relative outline-none"
                        data-tour="editor"
                      >
                        <PageCanvas
                          ref={articleRef as React.RefObject<HTMLDivElement>}
                          id="editor-content"
                          className="printable-paper"
                        >
                          <VisualEditor onEditorReady={onEditorReady} />
                        </PageCanvas>
                        <PageChromeLayer
                          pagesRootRef={articleRef as React.RefObject<HTMLElement>}
                          scrollContainerRef={scrollContainerRef}
                          pageSetup={pageSetup}
                          pageCount={pageCount}
                          onReserveHeightChange={setHeaderFooterReservePx}
                        />
                      </div>
                    </EditorPaperScrollBody>
                  </div>
                </div>
              )}
              <div className="flex shrink-0 items-center justify-between border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
                <StatusBar
                  rulerInfo={
                    previewMode === "preview" && templateMode ? null : rulerInfo
                  }
                  pageCount={pageCount}
                />
                <PaginationManager totalPages={pageCount} currentPage={currentPage} onPageChange={goToPage} />
              </div>
            </div>
            {sourceOpen && <SourcePane />}
          </div>
          {templateMode && <VariablePanel editor={editor} />}
          {templateMode && <VariableFillPopover editor={editor} />}
          <FieldFillPopover editor={editor} />
          {placeholderPanelOpen && <PlaceholderPanel editor={editor} />}
        </main>

        {isDragging && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[color:var(--color-background)]/70 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-[color:var(--color-accent)] bg-[color:var(--color-surface)] px-10 py-8 shadow-xl">
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
                รองรับ .docx, .xlsx, .html, .md และรูปภาพ
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
              className="flex items-center gap-3 rounded-xl bg-[color:var(--color-surface)] px-6 py-4 shadow-xl border border-[color:var(--color-border)]"
            >
              <Loader2 className="size-5 animate-spin text-[color:var(--color-accent)]" />
              <span className="text-sm font-medium text-[color:var(--color-foreground)]">กำลังโหลดไฟล์…</span>
            </div>
          </div>
        )}

        <DialogManager editor={editor} />
        {paragraphOpen && (
          <ParagraphDialog open={paragraphOpen} onClose={closeParagraph} editor={editor} />
        )}
        {mathOpen && (
          <MathInputDialog open={mathOpen} onClose={() => setMathOpen(false)} editor={editor} />
        )}
        <EditorContextMenu editor={editor} containerRef={articleRef} />
        <MobileBlock />
        <Tour />
      </div>
    </>
  );
}
