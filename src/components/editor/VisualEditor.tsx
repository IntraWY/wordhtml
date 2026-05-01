"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
// NOTE: dynamic-import for Table extensions deferred — adds complexity
// not justified by current bundle size. Revisit if Lighthouse flags it.
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { SearchAndReplace } from "@sereneinserenade/tiptap-search-and-replace";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import FontFamily from "@tiptap/extension-font-family";

import { useEditorStore } from "@/store/editorStore";
import { Upload, FileText, Keyboard } from "lucide-react";
import { cleanPastedHtml } from "@/lib/conversion/pasteCleanup";
import { IndentExtension } from "@/lib/tiptap/indentExtension";
import { ImageWithAlign } from "@/lib/tiptap/imageWithAlign";
import { FormattingToolbar } from "./FormattingToolbar";

interface VisualEditorProps {
  onEditorReady?: (editor: Editor | null) => void;
}

export function VisualEditor({ onEditorReady }: VisualEditorProps) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const setHtml = useEditorStore((s) => s.setHtml);

  const isEmpty = documentHtml.trim().length === 0;

  // Tracks the last HTML the editor itself emitted, so we can ignore store
  // updates that originated from the editor (e.g., when the source pane
  // mirrors the editor, we don't want to re-set content and lose the cursor).
  const lastWrittenHtml = useRef<string>("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      ImageWithAlign,
      Placeholder.configure({
        placeholder: "พิมพ์ วางจาก Word หรืออัปโหลดไฟล์ .docx เพื่อเริ่มต้น…",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Color,
      Highlight.configure({ multicolor: true }),
      IndentExtension,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      SearchAndReplace.configure({
        searchResultClass: "search-result",
        disableRegex: false,
      }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      FontFamily,
    ],
    content: documentHtml,
    editorProps: {
      attributes: {
        class:
          "prose-editor max-w-none outline-none min-h-full text-base leading-relaxed",
        role: "textbox",
        "aria-label": "โปรแกรมแก้ไขเอกสาร",
        "aria-multiline": "true",
      },
      transformPastedHTML(html) {
        return cleanPastedHtml(html);
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      lastWrittenHtml.current = html;
      setHtml(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (documentHtml === lastWrittenHtml.current) return;
    if (documentHtml === editor.getHTML()) return;
    editor.commands.setContent(documentHtml || "", { emitUpdate: false });
    lastWrittenHtml.current = documentHtml;
  }, [documentHtml, editor]);

  useEffect(() => {
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[color:var(--color-border)] bg-[color:var(--color-background)] px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
        โปรแกรมแก้ไข
      </div>
      {editor && <FormattingToolbar editor={editor} />}
      <div className="flex-1 min-h-0 overflow-auto px-8 py-6">
        {!editor ? (
          <div className="space-y-3 animate-pulse" aria-hidden="true">
            <div className="h-4 rounded bg-[color:var(--color-border)] w-3/4" />
            <div className="h-4 rounded bg-[color:var(--color-border)] w-full" />
            <div className="h-4 rounded bg-[color:var(--color-border)] w-5/6" />
            <div className="h-4 rounded bg-[color:var(--color-border)] w-2/3" />
            <div className="mt-6 h-4 rounded bg-[color:var(--color-border)] w-full" />
            <div className="h-4 rounded bg-[color:var(--color-border)] w-4/5" />
          </div>
        ) : (
          <>
            <EditorContent editor={editor} className="h-full" />
            {isEmpty && <EmptyHint />}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="mt-12 flex flex-col items-center gap-4 text-center select-none pointer-events-none" aria-hidden="true">
      <div className="flex items-center gap-6 text-[color:var(--color-muted-foreground)]">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
            <Upload className="size-4" />
          </div>
          <span className="text-[11px]">อัปโหลด .docx</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
            <FileText className="size-4" />
          </div>
          <span className="text-[11px]">วางจาก Word</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
            <Keyboard className="size-4" />
          </div>
          <span className="text-[11px]">พิมพ์เอง</span>
        </div>
      </div>
      <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
        Ctrl+O เปิดไฟล์ · ลากวางไฟล์ที่นี่ · Ctrl+Shift+N เอกสารใหม่
      </p>
    </div>
  );
}
