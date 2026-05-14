"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { EditorView } from "@tiptap/pm/view";
// NOTE: dynamic-import for Table extensions deferred — adds complexity
// not justified by current bundle size. Revisit if Lighthouse flags it.
import { Table, TableCell, TableHeader } from "@tiptap/extension-table";
import { RepeatingRow } from "@/lib/tiptap/repeatingRow";
import { VariableMark } from "@/lib/tiptap/variableMark";
import { PageBreak } from "@/lib/tiptap/pageBreak";
import { PaginationAware } from "@/lib/tiptap/paginationAware";
import { MathEquation } from "@/lib/tiptap/mathEquation";
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
import { usePaginationStore } from "@/store/paginationStore";
import { Upload, FileText, Keyboard, Braces } from "lucide-react";
import { addEventListener, removeEventListener, EVENT_NAMES } from "@/lib/events";
import { cleanPastedHtml } from "@/lib/conversion/pasteCleanup";
import { ParagraphFormatExtension } from "@/lib/tiptap/paragraphFormat";
import { FontSize } from "@/lib/tiptap/fontSize";
import { createImageWithAlign } from "@/lib/tiptap/imageWithAlign";
import { HeadingWithId } from "@/lib/tiptap/headingWithId";
import { BulletListWithClass } from "@/lib/tiptap/bulletListWithClass";
import { compressImageIfEnabled, readFileAsDataURL } from "@/lib/imageCompression";
import { ImageResizeView } from "./ImageResizeView";

interface VisualEditorProps {
  onEditorReady?: (editor: Editor | null) => void;
  visiblePages?: Set<number>;
  virtualScrollActive?: boolean;
}

export function VisualEditor({ onEditorReady, visiblePages, virtualScrollActive }: VisualEditorProps) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const setHtml = useEditorStore((s) => s.setHtml);
  const spellcheckEnabled = useEditorStore((s) => s.spellcheckEnabled);

  const isEmpty = documentHtml.trim().length === 0;

  // Tracks the last HTML the editor itself emitted, so we can ignore store
  // updates that originated from the editor (e.g., when the source pane
  // mirrors the editor, we don't want to re-set content and lose the cursor).
  const lastWrittenHtml = useRef<string>("");
  const editorRef = useRef<Editor | null>(null);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        link: false,
        underline: false,
      }),
      HeadingWithId.configure({ levels: [1, 2, 3] }),
      BulletListWithClass,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      createImageWithAlign(ImageResizeView),
      Placeholder.configure({
        placeholder: "พิมพ์ วางจาก Word หรืออัปโหลดไฟล์ .docx เพื่อเริ่มต้น…",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,
      ParagraphFormatExtension,
      Table.configure({ resizable: true }),
      RepeatingRow,
      TableHeader,
      TableCell,
      VariableMark,
      PageBreak,
      SearchAndReplace.configure({
        searchResultClass: "search-result",
        disableRegex: false,
      }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      FontFamily,
      PaginationAware,
      MathEquation,
    ],
    []
  );

  const onUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML();
      lastWrittenHtml.current = html;
      setHtml(html);
    },
    [setHtml]
  );

  const editorProps = useMemo(
    () => ({
      attributes: {
        class:
          "prose-editor max-w-none outline-none min-h-full text-base leading-relaxed",
        role: "textbox",
        spellcheck: spellcheckEnabled ? ("true" as const) : ("false" as const),
        "aria-label": "โปรแกรมแก้ไขเอกสาร",
        "aria-describedby": "editor-placeholder",
        "aria-multiline": "true",
      },
      transformPastedHTML(html: string) {
        return cleanPastedHtml(html);
      },
      handleKeyDown(_view: EditorView, event: KeyboardEvent) {
        const ed = editorRef.current;
        if (!ed) return false;

        // Intercept Ctrl+Enter / Cmd+Enter before HardBreak keymap
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          ed.chain().focus().insertPageBreak().run();
          return true;
        }

        // Backspace: outdent at start of indented paragraph, or delete 4-space tab block
        if (event.key === "Backspace") {
          const { selection } = ed.state;
          if (!selection.empty) return false;

          const { $from } = selection;

          // Case 1: At start of indented paragraph → remove indent
          if ($from.parentOffset === 0) {
            const marginLeft = ($from.parent.attrs.marginLeft as number) ?? 0;
            if (marginLeft > 0) {
              const next = Math.max(
                0,
                Math.round((marginLeft - 0.5) * 10) / 10
              );
              event.preventDefault();
              ed.chain().focus().setParagraphFormat({ marginLeft: next }).run();
              return true;
            }
          }

          // Case 2: Isolated 4-space tab block before cursor → delete all 4
          if ($from.parentOffset >= 4) {
            const text = $from.parent.textContent;
            // parentOffset counts ProseMirror document positions (1-based into the
            // paragraph), whereas textContent is a 0-based string — align them.
            const textOffset = $from.parentOffset - 1;
            const prev4 = text.slice(textOffset - 4, textOffset);
            const charBefore = textOffset >= 5 ? text[textOffset - 5] : "";
            if (prev4 === "    " && charBefore !== " ") {
              const startPos = $from.pos - 4;
              const slice = ed.state.doc.textBetween(startPos, $from.pos);
              if (slice === "    ") {
                event.preventDefault();
                const tr = ed.state.tr.delete(startPos, $from.pos);
                ed.view.dispatch(tr);
                return true;
              }
            }
          }
        }

        return false;
      },
      handleDrop(view: EditorView, event: DragEvent) {
        event.preventDefault();
        const text = event.dataTransfer?.getData("text/plain");
        if (!text) return false;
        const match = /^\{\{([A-Za-z_\u0E00-\u0E7F][\w\u0E00-\u0E7F_]*)\}\}$/.exec(text);
        if (!match) return false;
        const name = match[1];
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (!coords) return false;
        const pos = coords.pos;
        const mark = view.state.schema.marks.variable.create({ name });
        const node = view.state.schema.text(text, [mark]);
        view.dispatch(view.state.tr.insert(pos, node));
        return true;
      },
      handlePaste(_view: unknown, event: ClipboardEvent) {
        const files = event.clipboardData?.files;
        if (!files || files.length === 0) return false;
        const imageFiles = Array.from(files).filter((f) =>
          f.type.startsWith("image/")
        );
        if (imageFiles.length === 0) return false;

        event.preventDefault();
        const autoCompress = useEditorStore.getState().autoCompressImages;

        for (const file of imageFiles) {
          compressImageIfEnabled(file, autoCompress)
            .then((finalFile) => readFileAsDataURL(finalFile))
            .then((src) => {
              const ed = editorRef.current;
              if (ed) {
                ed.chain().focus().setImage({ src, alt: "รูปภาพ (Image)" }).run();
              }
            })
            .catch(() => {
              // fallback: insert original without compression
              readFileAsDataURL(file).then((src) => {
                const ed = editorRef.current;
                if (ed) {
                  ed.chain().focus().setImage({ src, alt: "รูปภาพ (Image)" }).run();
                }
              });
            });
        }
        return true;
      },
    }),
    [spellcheckEnabled]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: documentHtml,
    editorProps,
    onUpdate,
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

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

  useEffect(() => {
    const handler = () => {
      const ed = editorRef.current;
      if (ed) {
        ed.chain().focus().insertPageBreak().run();
      }
    };
    addEventListener(EVENT_NAMES.insertPageBreak, handler);
    return () => {
      removeEventListener(EVENT_NAMES.insertPageBreak, handler);
    };
  }, []);

  useEffect(() => {
    if (!virtualScrollActive || !editor) return;
    if (!visiblePages || visiblePages.size === 0) return;

    const prose = editor.view.dom as HTMLElement;
    if (!prose) return;

    const children = Array.from(prose.children) as HTMLElement[];
    if (children.length === 0) return;

    // Map each child element to its page index based on offsetTop relative to article.
    const article = prose.closest("article.paper") as HTMLElement | null;
    const articleTop = article?.getBoundingClientRect().top ?? 0;

    const pageBreaks = usePaginationStore.getState().pageBreaks;

    for (const el of children) {
      const elTop = el.getBoundingClientRect().top - articleTop;
      let pageIdx = 0;
      for (let i = 1; i < pageBreaks.length; i++) {
        if (pageBreaks[i] <= elTop + 1) {
          pageIdx = i;
        } else {
          break;
        }
      }

      const isVisible = visiblePages.has(pageIdx);
      if (isVisible) {
        el.style.contentVisibility = "";
        el.style.containIntrinsicSize = "";
      } else {
        el.style.contentVisibility = "auto";
        // Approximate intrinsic height to preserve scroll thumb size.
        const rect = el.getBoundingClientRect();
        el.style.containIntrinsicSize = `${rect.width}px ${rect.height}px`;
      }
    }
  }, [editor, visiblePages, virtualScrollActive]);

  if (!editor) {
    return (
      <div className="space-y-3 animate-pulse" aria-hidden="true">
        <div className="h-4 rounded bg-[color:var(--color-border)] w-3/4" />
        <div className="h-4 rounded bg-[color:var(--color-border)] w-full" />
        <div className="h-4 rounded bg-[color:var(--color-border)] w-5/6" />
        <div className="h-4 rounded bg-[color:var(--color-border)] w-2/3" />
        <div className="mt-6 h-4 rounded bg-[color:var(--color-border)] w-full" />
        <div className="h-4 rounded bg-[color:var(--color-border)] w-4/5" />
      </div>
    );
  }
  return (
    <>
      <span id="editor-placeholder" className="sr-only">
        พิมพ์ วางจาก Word หรืออัปโหลดไฟล์ .docx เพื่อเริ่มต้น…
      </span>
      <EditorContent editor={editor} className="h-full" aria-label="เนื้อหาเอกสาร (Document content)" />
      {isEmpty && <EmptyHint />}
    </>
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
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
            <Braces className="size-4" />
          </div>
          <span className="text-[11px]">ใช้ตัวแปร (Vars)</span>
        </div>
      </div>
      <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
        Ctrl+O เปิดไฟล์ · ลากวางไฟล์ที่นี่ · Ctrl+Shift+N เอกสารใหม่
      </p>
      <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
        พิมพ์ {"{{ชื่อตัวแปร}}"} เพื่อสร้างตัวแปร · เปิดโหมด Template ที่เมนูมุมมอง
      </p>
    </div>
  );
}
