"use client";

import { useEffect } from "react";
import type { Editor } from "@tiptap/react";

import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { useToastStore } from "@/store/toastStore";
import { useDialogStore } from "@/store/dialogStore";

export function useKeyboardShortcuts(editor: Editor | null) {
  const openExportDialog = useUiStore((s) => s.openExportDialog);
  const closeExportDialog = useUiStore((s) => s.closeExportDialog);
  const toggleFullscreen = useUiStore((s) => s.toggleFullscreen);
  const openSearch = useUiStore((s) => s.openSearch);
  const closeSearch = useUiStore((s) => s.closeSearch);
  const openShortcuts = useUiStore((s) => s.openShortcuts);
  const openPageSetup = useUiStore((s) => s.openPageSetup);
  const saveSnapshot = useEditorStore((s) => s.saveSnapshot);
  const triggerFileOpen = useEditorStore((s) => s.triggerFileOpen);
  const reset = useEditorStore((s) => s.reset);
  const hasDoc = useEditorStore((s) => s.documentHtml.length > 0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
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
        toggleFullscreen();
        return;
      }
      if (event.key === "F1") {
        event.preventDefault();
        openShortcuts();
        return;
      }

      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const key = event.key.toLowerCase();

      if (key === "s" && event.shiftKey) {
        event.preventDefault();
        saveSnapshot();
        return;
      }

      if (key === "n" && event.shiftKey) {
        event.preventDefault();
        const { openConfirm } = useDialogStore.getState();
        openConfirm(
          "เอกสารใหม่ (New Document)",
          "ล้างเนื้อหาปัจจุบันและเริ่มเอกสารใหม่?",
          () => reset()
        );
        return;
      }

      if (key === "s" && !event.shiftKey) {
        event.preventDefault();
        if (hasDoc) {
          saveSnapshot();
          openExportDialog();
        }
        return;
      }

      if (key === "o") {
        event.preventDefault();
        triggerFileOpen();
        return;
      }

      if (key === "f" && !event.shiftKey) {
        event.preventDefault();
        const searchOpen = useUiStore.getState().searchOpen;
        if (searchOpen) {
          closeSearch();
        } else {
          openSearch();
        }
        return;
      }

      if (key === "k") {
        event.preventDefault();
        useDialogStore.getState().openPrompt(
          "แทรกลิงก์ (Insert Link)",
          "ใส่ URL ของลิงก์:",
          "https://",
          (url: string) => {
            if (!url || !editor) return;
            let validatedUrl = url;
            try {
              const parsed = new URL(url, window.location.href);
              if (parsed.protocol === "javascript:") {
                useToastStore.getState().show("ไม่รองรับ URL ประเภท javascript:", "error");
                return;
              }
              validatedUrl = parsed.href;
            } catch {
              if (/^javascript:/i.test(url)) {
                useToastStore.getState().show("ไม่รองรับ URL ประเภท javascript:", "error");
                return;
              }
            }
            editor.chain().focus().setLink({ href: validatedUrl }).run();
          }
        );
        return;
      }

      if (key === "p") {
        event.preventDefault();
        window.print();
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    editor,
    openExportDialog,
    closeExportDialog,
    toggleFullscreen,
    openSearch,
    closeSearch,
    openShortcuts,
    saveSnapshot,
    hasDoc,
    triggerFileOpen,
    reset,
  ]);
}
