"use client";

import { useEffect } from "react";
import type { Editor } from "@tiptap/react";

import { useEditorStore } from "@/store/editorStore";
import { useTemplateStore } from "@/store/templateStore";
import { useUiStore } from "@/store/uiStore";
import { addEventListener, removeEventListener, EVENT_NAMES } from "@/lib/events";
import { unwrapPageNode } from "@/lib/unwrapPageNode";
import { normalizeImagePercentWidths } from "@/lib/imageScale";
import { measurePageBodyWidthFromDom } from "@/lib/pageContentWidth";
import { isLiveEditor } from "@/lib/editorLive";
import { insertVariableBadge } from "@/lib/tiptap/insertVariableBadge";

interface EditorEventBridgeOptions {
  /** Live ref to the current editor instance. */
  editorRef: React.RefObject<Editor | null>;
  /** Live ref to the current page (for page-next/prev relative navigation). */
  currentPageRef: React.RefObject<number>;
  /** Navigate to an absolute page index. */
  goToPage: (page: number) => void;
  /** Open the math equation dialog. */
  setMathOpen: (open: boolean) => void;
}

/**
 * Custom-event bridge between menu components and the editor shell.
 * Wires `wordhtml:*` window events to UI-store / editor actions.
 *
 * Behaviour-identical extraction of the effect formerly inline in
 * `EditorShell`. Keep the dependency list and listener set in sync.
 */
export function useEditorEventBridge({
  editorRef,
  currentPageRef,
  goToPage,
  setMathOpen,
}: EditorEventBridgeOptions) {
  const openSearch = useUiStore((s) => s.openSearch);
  const openPageSetup = useUiStore((s) => s.openPageSetup);
  const openShortcuts = useUiStore((s) => s.openShortcuts);
  const openToc = useUiStore((s) => s.openToc);
  const openHeaderFooter = useUiStore((s) => s.openHeaderFooter);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSearch, openPageSetup, openShortcuts, openToc, openHeaderFooter, goToPage]);
}
