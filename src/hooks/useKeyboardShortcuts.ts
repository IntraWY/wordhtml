"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";

import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { useToastStore } from "@/store/toastStore";
import { useDialogStore } from "@/store/dialogStore";
import { isLiveEditor } from "@/lib/editorLive";

/**
 * Whether a keydown target should suppress the app's global shortcuts.
 *
 * Skip only plain form fields (variable-value inputs, the find/replace box,
 * spin buttons, …) where the keystroke is literal text entry. The main document
 * surface and the header/footer mini-editors are `contentEditable` — shortcuts
 * like Ctrl+S / Ctrl+F MUST keep working there (that is the normal editing
 * state). The previous guard also bailed on `isContentEditable`, which silently
 * disabled every shortcut while the cursor was in the document.
 */
export function shouldIgnoreShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA";
}

export function useKeyboardShortcuts(editor: Editor | null) {
  const editorRef = useRef(editor);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const openExportDialog = useUiStore((s) => s.openExportDialog);
  const toggleFullscreen = useUiStore((s) => s.toggleFullscreen);
  const openSearch = useUiStore((s) => s.openSearch);
  const closeSearch = useUiStore((s) => s.closeSearch);
  const openShortcuts = useUiStore((s) => s.openShortcuts);
  const saveSnapshot = useEditorStore((s) => s.saveSnapshot);
  const triggerFileOpen = useEditorStore((s) => s.triggerFileOpen);
  const newDocument = useEditorStore((s) => s.newDocument);
  const hasDoc = useEditorStore((s) => s.documentHtml.length > 0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (shouldIgnoreShortcut(event.target)) return;

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
          "บันทึกเนื้อหาปัจจุบันลงประวัติแล้วเริ่มเอกสารใหม่?",
          () => newDocument()
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

      if (key === "k" && event.shiftKey) {
        event.preventDefault();
        useDialogStore.getState().openPrompt(
          "แทรกลิงก์ (Insert Link)",
          "ใส่ URL ของลิงก์:",
          "https://",
          (url: string) => {
            const ed = editorRef.current;
            if (!url || !isLiveEditor(ed)) return;
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
            ed.chain().focus().setLink({ href: validatedUrl }).run();
          }
        );
        return;
      }

      if (key === "p") {
        event.preventDefault();
        window.print();
        return;
      }

      if (key === "m" && event.shiftKey) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("wordhtml:open-math-dialog"));
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    toggleFullscreen,
    openSearch,
    closeSearch,
    openShortcuts,
    saveSnapshot,
    hasDoc,
    triggerFileOpen,
    newDocument,
    openExportDialog,
  ]);
}
