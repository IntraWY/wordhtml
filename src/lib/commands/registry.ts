import type { Editor } from "@tiptap/react";

import {
  dispatchOpenBatchConvert,
  dispatchOpenFile,
  dispatchOpenHeaderFooter,
  dispatchOpenPageSetup,
  dispatchOpenSearch,
  dispatchOpenShortcuts,
  dispatchOpenTemplates,
  dispatchOpenToc,
  dispatchInsertPageBreak,
  dispatchInsertVariable,
} from "@/lib/events";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { useDialogStore } from "@/store/dialogStore";
import { isLiveEditor } from "@/lib/editorLive";

export interface CommandItem {
  id: string;
  label: string;
  labelEn: string;
  keywords: string[];
  shortcut?: string;
  run: (editor: Editor | null) => void;
}

export function buildCommandRegistry(): CommandItem[] {
  return [
    {
      id: "open-file",
      label: "เปิดไฟล์",
      labelEn: "Open file",
      keywords: ["open", "docx", "html", "import"],
      shortcut: "Ctrl+O",
      run: () => useEditorStore.getState().triggerFileOpen(),
    },
    {
      id: "new-doc",
      label: "เอกสารใหม่",
      labelEn: "New document",
      keywords: ["new", "clear", "reset"],
      shortcut: "Ctrl+Shift+N",
      run: () => {
        useDialogStore.getState().openConfirm(
          "เอกสารใหม่ (New Document)",
          "ล้างเนื้อหาปัจจุบันและเริ่มเอกสารใหม่?",
          () => useEditorStore.getState().reset()
        );
      },
    },
    {
      id: "export",
      label: "ส่งออก",
      labelEn: "Export",
      keywords: ["export", "download", "save"],
      shortcut: "Ctrl+S",
      run: () => {
        const s = useEditorStore.getState();
        if (s.getDocumentHtml().trim()) {
          s.saveSnapshot();
          useUiStore.getState().openExportDialog();
        }
      },
    },
    {
      id: "snapshot",
      label: "บันทึก Snapshot",
      labelEn: "Save snapshot",
      keywords: ["snapshot", "history"],
      shortcut: "Ctrl+Shift+S",
      run: () => useEditorStore.getState().saveSnapshot(),
    },
    {
      id: "find",
      label: "ค้นหาและแทนที่",
      labelEn: "Find & replace",
      keywords: ["find", "search", "replace"],
      shortcut: "Ctrl+F",
      run: () => dispatchOpenSearch(),
    },
    {
      id: "page-setup",
      label: "ตั้งค่าหน้ากระดาษ",
      labelEn: "Page setup",
      keywords: ["page", "margin", "a4"],
      run: () => dispatchOpenPageSetup(),
    },
    {
      id: "header-footer",
      label: "ส่วนหัว/ท้าย",
      labelEn: "Header & footer",
      keywords: ["header", "footer", "page number"],
      run: () => dispatchOpenHeaderFooter(),
    },
    {
      id: "toc",
      label: "สารบัญ",
      labelEn: "Table of contents",
      keywords: ["toc", "outline", "heading"],
      run: () => dispatchOpenToc(),
    },
    {
      id: "templates",
      label: "เทมเพลต",
      labelEn: "Templates",
      keywords: ["template"],
      run: () => dispatchOpenTemplates(),
    },
    {
      id: "template-gallery",
      label: "แกลเลอรีเทมเพลต",
      labelEn: "Template gallery",
      keywords: ["gallery", "preset", "memo"],
      run: () => useUiStore.getState().openTemplateGallery(),
    },
    {
      id: "batch",
      label: "แปลงเป็นกลุ่ม",
      labelEn: "Batch convert",
      keywords: ["batch", "zip", "multiple"],
      run: () => dispatchOpenBatchConvert(),
    },
    {
      id: "placeholder",
      label: "แผง Placeholder",
      labelEn: "Placeholder panel",
      keywords: ["variable", "merge", "{{"],
      run: () => useUiStore.getState().openPlaceholderPanel(),
    },
    {
      id: "source",
      label: "แหล่ง HTML",
      labelEn: "HTML source",
      keywords: ["source", "code", "html"],
      run: () => useUiStore.getState().toggleSource(),
    },
    {
      id: "shortcuts",
      label: "แป้นพิมพ์ลัด",
      labelEn: "Keyboard shortcuts",
      keywords: ["help", "f1"],
      shortcut: "F1",
      run: () => dispatchOpenShortcuts(),
    },
    {
      id: "page-break",
      label: "แบ่งหน้า",
      labelEn: "Page break",
      keywords: ["break", "page"],
      run: () => dispatchInsertPageBreak(),
    },
    {
      id: "variable",
      label: "แทรกตัวแปร",
      labelEn: "Insert variable",
      keywords: ["variable", "{{"],
      run: () => dispatchInsertVariable("variable"),
    },
    {
      id: "heading-1",
      label: "หัวข้อ 1",
      labelEn: "Heading 1",
      keywords: ["h1", "heading"],
      run: (editor) => {
        if (!isLiveEditor(editor)) return;
        editor.chain().focus().toggleHeading({ level: 1 }).run();
      },
    },
    {
      id: "table",
      label: "แทรกตาราง",
      labelEn: "Insert table",
      keywords: ["table"],
      run: (editor) => {
        if (!isLiveEditor(editor)) return;
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      },
    },
    {
      id: "link",
      label: "แทรกลิงก์",
      labelEn: "Insert link",
      keywords: ["link", "url"],
      shortcut: "Ctrl+Shift+K",
      run: (editor) => {
        useDialogStore.getState().openPrompt(
          "แทรกลิงก์ (Insert Link)",
          "ใส่ URL ของลิงก์:",
          "https://",
          (url: string) => {
            if (!url || !isLiveEditor(editor)) return;
            editor.chain().focus().setLink({ href: url }).run();
          }
        );
      },
    },
    {
      id: "open-file-event",
      label: "เปิดตัวเลือกไฟล์",
      labelEn: "Open file picker",
      keywords: [],
      run: () => dispatchOpenFile(),
    },
  ];
}
