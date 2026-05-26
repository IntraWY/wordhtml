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
import { PagedDocument } from "@/lib/tiptap/pagedDocument";
import { PageNode } from "@/lib/tiptap/pageNode";
import { PageBodyNode } from "@/lib/tiptap/pageBody";
import { PageHeaderNode } from "@/lib/tiptap/pageHeader";
import { PageFooterNode } from "@/lib/tiptap/pageFooter";
import { PageCommands } from "@/lib/tiptap/pageCommands";
import { PlaceholderField } from "@/lib/tiptap/placeholderField";
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
import { VariableSuggestion } from "@/lib/tiptap/variableSuggestionExtension";

import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { getEmptyStateConfig, isDocumentEmpty } from "@/lib/placeholders";
import {
  editorEmptyPlaceholderText,
  setEditorEmptyPlaceholderText,
} from "@/lib/editorEmptyPlaceholder";
import { dispatchOpenFile } from "@/lib/events";
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
import { isLiveEditor } from "@/lib/editorLive";
import { useToastStore } from "@/store/toastStore";

interface VisualEditorProps {
  onEditorReady?: (editor: Editor | null) => void;
}

function defaultPageSetup() {
  return {
    size: "A4" as const,
    orientation: "portrait" as const,
    marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
  };
}

function wrapInPageNode(html: string): string {
  if (html.includes('class="page-node"')) return html;
  if (html.trim() === "") {
    return `<div class="page-node" data-page-number="1" data-page-setup='${JSON.stringify(defaultPageSetup())}'><div class="page-body" data-page-body="true"><p></p></div></div>`;
  }
  return `<div class="page-node" data-page-number="1" data-page-setup='${JSON.stringify(defaultPageSetup())}'><div class="page-body" data-page-body="true">${html}</div></div>`;
}

function unwrapPageNode(html: string): string {
  // Only unwrap single-page documents. Multi-page HTML preserves its structure.
  if (!html.includes('class="page-node"')) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes = doc.querySelectorAll(".page-node");
  if (nodes.length !== 1) return html;

  const body = nodes[0].querySelector(".page-body");
  if (!body) return html;

  return body.innerHTML;
}

export function VisualEditor({ onEditorReady }: VisualEditorProps) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const setHtml = useEditorStore((s) => s.setHtml);
  const spellcheckEnabled = useEditorStore((s) => s.spellcheckEnabled);
  const templateMode = useEditorStore((s) => s.templateMode);
  const previewMode = useEditorStore((s) => s.previewMode);
  const dataSet = useEditorStore((s) => s.dataSet);
  const lastLoadWarnings = useEditorStore((s) => s.lastLoadWarnings);
  const setPreviewMode = useEditorStore((s) => s.setPreviewMode);
  const openPlaceholderPanel = useUiStore((s) => s.openPlaceholderPanel);

  const isEmpty = isDocumentEmpty(documentHtml);
  const emptyState = getEmptyStateConfig({
    documentHtml,
    templateMode,
    previewMode,
    hasDataSet: Boolean(dataSet),
    dataSetRowIndex: dataSet?.currentRowIndex,
    lastLoadWarnings,
  });

  // Tracks the last HTML the editor itself emitted, so we can ignore store
  // updates that originated from the editor (e.g., when the source pane
  // mirrors the editor, we don't want to re-set content and lose the cursor).
  const lastWrittenHtml = useRef<string>("");
  const editorRef = useRef<Editor | null>(null);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        document: false,
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
        placeholder: () => editorEmptyPlaceholderText,
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
      VariableSuggestion,
      PaginationAware,
      MathEquation,
      PagedDocument,
      PageNode,
      PageBodyNode,
      PageHeaderNode,
      PageFooterNode,
      PageCommands,
      PlaceholderField,
    ],
    []
  );

  const onUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const html = unwrapPageNode(editor.getHTML());
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
        if (!isLiveEditor(ed)) return false;

        // Intercept Ctrl+Enter / Cmd+Enter before HardBreak keymap
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          const ok = ed.chain().focus().splitPage().run();
          if (!ok) ed.chain().focus().insertPageBreak().run();
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
              if (isLiveEditor(ed)) {
                ed.chain().focus().setImage({ src, alt: "รูปภาพ (Image)" }).run();
              }
            })
            .catch(() => {
              readFileAsDataURL(file)
                .then((src) => {
                  const ed = editorRef.current;
                  if (isLiveEditor(ed)) {
                    ed.chain().focus().setImage({ src, alt: "รูปภาพ (Image)" }).run();
                  }
                })
                .catch(() => {
                  useToastStore.getState().show("ไม่สามารถแทรกรูปภาพได้", "error");
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
    content: wrapInPageNode(documentHtml),
    editorProps,
    onUpdate,
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    setEditorEmptyPlaceholderText(emptyState.tiptapPlaceholder);
    if (!isLiveEditor(editor)) return;
    editor.view.dispatch(editor.state.tr);
  }, [emptyState.tiptapPlaceholder, editor]);

  useEffect(() => {
    if (!isLiveEditor(editor)) return;
    if (documentHtml === lastWrittenHtml.current) return;
    const editorHtml = unwrapPageNode(editor.getHTML());
    if (documentHtml === editorHtml) return;
    editor.commands.setContent(wrapInPageNode(documentHtml || ""), { emitUpdate: false });
    lastWrittenHtml.current = documentHtml;
  }, [documentHtml, editor]);

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => {
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady]);

  useEffect(() => {
    const handler = () => {
      const ed = editorRef.current;
      if (!isLiveEditor(ed)) return;
      const ok = ed.chain().focus().splitPage().run();
      if (!ok) ed.chain().focus().insertPageBreak().run();
    };
    addEventListener(EVENT_NAMES.insertPageBreak, handler);
    return () => {
      removeEventListener(EVENT_NAMES.insertPageBreak, handler);
    };
  }, []);

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
        {emptyState.srOnlyDescription}
      </span>
      <EditorContent editor={editor} className="h-full" aria-label="เนื้อหาเอกสาร (Document content)" />
      {isEmpty && emptyState.showEmptyHint && (
        <EmptyHint
          config={emptyState}
          onOpenFile={dispatchOpenFile}
          onPreview={() => setPreviewMode("preview")}
          onOpenVariables={openPlaceholderPanel}
        />
      )}
    </>
  );
}

function EmptyHint({
  config,
  onOpenFile,
  onPreview,
  onOpenVariables,
}: {
  config: ReturnType<typeof getEmptyStateConfig>;
  onOpenFile: () => void;
  onPreview: () => void;
  onOpenVariables: () => void;
}) {
  const handleAction = (action: string) => {
    if (action === "open-file") onOpenFile();
    if (action === "preview") onPreview();
    if (action === "variables") onOpenVariables();
  };

  return (
    <div className="mt-12 flex flex-col items-center gap-4 text-center select-none" aria-hidden="true">
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
      {config.hintTitle && (
        <p className="text-sm font-medium text-[color:var(--color-foreground)]">
          {config.hintTitle}
        </p>
      )}
      {config.hintSubtitle && (
        <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
          {config.hintSubtitle}
        </p>
      )}
      {config.actions && config.actions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 pointer-events-auto">
          {config.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action.action)}
              className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5 text-[11px] font-medium shadow-sm hover:bg-[color:var(--color-muted)]"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      {config.variant === "default" && (
        <p className="text-[11px] text-[color:var(--color-muted-foreground)] pointer-events-none">
          พิมพ์ {"{{ชื่อตัวแปร}}"} เพื่อสร้างตัวแปร · เปิดแผง Placeholder ที่เมนูมุมมอง
        </p>
      )}
    </div>
  );
}
