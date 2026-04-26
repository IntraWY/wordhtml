"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";

import { useEditorStore } from "@/store/editorStore";
import { cleanPastedHtml } from "@/lib/conversion/pasteCleanup";
import { IndentExtension } from "@/lib/tiptap/indentExtension";
import { FormattingToolbar } from "./FormattingToolbar";

interface VisualEditorProps {
  onEditorReady?: (editor: Editor | null) => void;
}

export function VisualEditor({ onEditorReady }: VisualEditorProps) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const setHtml = useEditorStore((s) => s.setHtml);

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
      Image.configure({ inline: false }),
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
      <div className="flex-1 overflow-auto px-8 py-6">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
