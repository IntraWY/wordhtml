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
import { PageBodyTrailingParagraph } from "@/lib/tiptap/pageBodyTrailingParagraph";
import { PageHeaderNode } from "@/lib/tiptap/pageHeader";
import { PageFooterNode } from "@/lib/tiptap/pageFooter";
import { PageCommands } from "@/lib/tiptap/pageCommands";
import { PlaceholderField } from "@/lib/tiptap/placeholderField";
import { ImageSlot, TableSlot } from "@/lib/tiptap/contentSlots";
import { SlashCommandsExtension } from "@/lib/tiptap/slashCommandsExtension";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";

/** Ctrl+K is reserved for the command palette; links use Ctrl+Shift+K. */
const EditorLink = Link.extend({
  addKeyboardShortcuts() {
    return {};
  },
});
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { SearchAndReplace } from "@sereneinserenade/tiptap-search-and-replace";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import FontFamily from "@tiptap/extension-font-family";
import { VariableSuggestion } from "@/lib/tiptap/variableSuggestionExtension";
import { VariableTypingGuard } from "@/lib/tiptap/variableTypingGuard";

import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { getEmptyStateConfig, isDocumentEmpty } from "@/lib/placeholders";
import {
  editorEmptyPlaceholderText,
  setEditorEmptyPlaceholderText,
} from "@/lib/editorEmptyPlaceholder";
import { dispatchOpenFile } from "@/lib/events";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Upload, FileText, Keyboard, Braces, Eye } from "lucide-react";
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
import { debugPerfLog } from "@/lib/debugPerfLog";
import { unwrapPageNode } from "@/lib/unwrapPageNode";
import { getPageSelectionContext } from "@/lib/pagination/pageSelection";
import { isPageBodyEffectivelyEmpty } from "@/lib/pagination/pageBodyEmpty";
import { runPaginationMaintenance } from "@/lib/pagination/paginationMaintenance";
import { dispatchPaginationCooldown } from "@/lib/events";
import { insertVariableBadge } from "@/lib/tiptap/insertVariableBadge";

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

export function VisualEditor({ onEditorReady }: VisualEditorProps) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const htmlSyncRevision = useEditorStore((s) => s.htmlSyncRevision);
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
  const lastSyncedRevision = useRef(0);
  const editorRef = useRef<Editor | null>(null);
  const paginationMaintenanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

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
      EditorLink.configure({
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
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,
      ParagraphFormatExtension,
      Table.configure({ resizable: true }),
      RepeatingRow,
      TableHeader,
      TableCell,
      VariableMark,
      VariableTypingGuard,
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
      PageBodyTrailingParagraph,
      PageHeaderNode,
      PageFooterNode,
      PageCommands,
      PlaceholderField,
      ImageSlot,
      TableSlot,
      SlashCommandsExtension,
    ],
    []
  );

  const onUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const t0 = performance.now();
      const html = unwrapPageNode(editor.getHTML());
      const getHtmlMs = performance.now() - t0;
      lastWrittenHtml.current = html;
      setHtml(html, { debounce: true });
      // #region agent log
      debugPerfLog("A", "VisualEditor.tsx:onUpdate", "editor onUpdate", {
        getHtmlMs: Math.round(getHtmlMs * 100) / 100,
        htmlLen: html.length,
        pageNodes: (html.match(/class="page-node"/g) ?? []).length,
      });
      // #endregion
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

        // Command palette (overrides Link extension Mod-k in the editor).
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "k" &&
          !event.shiftKey
        ) {
          event.preventDefault();
          useUiStore.getState().openCommandPalette();
          return true;
        }

        // Intercept Ctrl+Enter / Cmd+Enter before HardBreak keymap
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          const ok = ed.chain().focus().splitPage().run();
          if (!ok) ed.chain().focus().insertPageBreak().run();
          return true;
        }

        const pageCtx = getPageSelectionContext(ed.state);

        const finishPageBoundaryEdit = () => {
          runPaginationMaintenance(ed);
          dispatchPaginationCooldown();
        };

        // Backspace at top of page 2+ → merge into previous page (prevents orphan empty pages).
        if (event.key === "Backspace" && pageCtx?.atPageBodyStart && pageCtx.pageNumber > 1) {
          event.preventDefault();
          const merged = ed.chain().focus().mergeWithPreviousPage().run();
          if (merged) {
            finishPageBoundaryEdit();
            return true;
          }
        }

        // Delete at end of page → remove empty next page instead of leaving extra canvas pages.
        if (event.key === "Delete" && pageCtx?.atPageBodyEnd) {
          const { state } = ed;
          const { $from } = state.selection;
          let currentPagePos = -1;
          let currentPageNode = state.doc;
          for (let d = $from.depth; d >= 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "pageNode") {
              currentPagePos = $from.before(d);
              currentPageNode = node;
              break;
            }
          }
          if (currentPagePos >= 0) {
            let nextPageBody = state.doc;
            state.doc.nodesBetween(
              currentPagePos + currentPageNode.nodeSize,
              state.doc.content.size,
              (node) => {
                if (node.type.name === "pageBody") {
                  nextPageBody = node;
                  return false;
                }
                return true;
              }
            );
            if (
              nextPageBody !== state.doc &&
              isPageBodyEffectivelyEmpty(nextPageBody)
            ) {
              event.preventDefault();
              const merged = ed.chain().focus().mergePage().run();
              if (merged) {
                finishPageBoundaryEdit();
                return true;
              }
            }
          }
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

        // After default Delete/Backspace: debounced prune of orphan empty pages.
        if (
          (event.key === "Delete" || event.key === "Backspace") &&
          !event.ctrlKey &&
          !event.metaKey
        ) {
          if (paginationMaintenanceTimerRef.current) {
            clearTimeout(paginationMaintenanceTimerRef.current);
          }
          paginationMaintenanceTimerRef.current = setTimeout(() => {
            paginationMaintenanceTimerRef.current = null;
            const live = editorRef.current;
            if (!isLiveEditor(live)) return;
            const { pruned } = runPaginationMaintenance(live);
            if (pruned > 0) dispatchPaginationCooldown();
          }, 200);
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
        const ed = editorRef.current;
        if (isLiveEditor(ed)) {
          insertVariableBadge(ed, coords.pos, name);
        } else {
          const mark = view.state.schema.marks.variable.create({ name });
          const node = view.state.schema.text(text, [mark]);
          view.dispatch(view.state.tr.insert(coords.pos, node));
        }
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

    const isExternalLoad = htmlSyncRevision > lastSyncedRevision.current;
    if (!isExternalLoad) {
      const editorHtml = unwrapPageNode(editor.getHTML());
      if (documentHtml === editorHtml) return;
    }

    const wrapped = wrapInPageNode(documentHtml || "");
    let cancelled = false;

    const applyContent = () => {
      if (cancelled || !isLiveEditor(editor)) return;
      const t0 = performance.now();
      editor.commands.setContent(wrapped, { emitUpdate: false });
      lastWrittenHtml.current = documentHtml;
      lastSyncedRevision.current = htmlSyncRevision;
      // #region agent log
      debugPerfLog("A", "VisualEditor.tsx:setContent", "external html applied", {
        setContentMs: Math.round((performance.now() - t0) * 100) / 100,
        htmlLen: documentHtml.length,
        isExternalLoad,
      });
      // #endregion
    };

    if (isExternalLoad) {
      requestAnimationFrame(applyContent);
    } else {
      applyContent();
    }

    return () => {
      cancelled = true;
    };
  }, [documentHtml, editor, htmlSyncRevision]);

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => {
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!isLiveEditor(editor)) return;
    const onBlur = () => {
      useEditorStore.getState().flushDocumentHtml();
    };
    editor.on("blur", onBlur);
    return () => {
      editor.off("blur", onBlur);
    };
  }, [editor]);

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
      <div className="relative w-full">
        <EditorContent editor={editor} className="h-full" aria-label="เนื้อหาเอกสาร (Document content)" />
        {isEmpty && emptyState.showEmptyHint && (
          <EmptyHint
            config={emptyState}
            onOpenFile={dispatchOpenFile}
            onPreview={() => setPreviewMode("preview")}
            onOpenVariables={openPlaceholderPanel}
          />
        )}
      </div>
    </>
  );
}

const TEMPLATE_EMPTY_VARIANTS = new Set<EmptyStateConfig["variant"]>([
  "template",
  "template-preview",
]);

type EmptyStateConfig = ReturnType<typeof getEmptyStateConfig>;

function EmptyHint({
  config,
  onOpenFile,
  onPreview,
  onOpenVariables,
}: {
  config: EmptyStateConfig;
  onOpenFile: () => void;
  onPreview: () => void;
  onOpenVariables: () => void;
}) {
  const isTemplate = TEMPLATE_EMPTY_VARIANTS.has(config.variant);
  const regionLabel = config.hintTitle ?? "เริ่มต้นเอกสาร (Get started)";

  const handleAction = (action: string) => {
    if (action === "open-file") onOpenFile();
    if (action === "preview") onPreview();
    if (action === "variables") onOpenVariables();
  };

  return (
    <div
      role="region"
      aria-label={regionLabel}
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 py-10"
    >
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        {isTemplate ? (
          <TemplateEmptyVisual variant={config.variant} />
        ) : (
          <DefaultEmptyVisual />
        )}

        {config.hintTitle && (
          <h2 className="text-sm font-semibold text-[color:var(--color-foreground)]">
            {config.hintTitle}
          </h2>
        )}
        {config.hintSubtitle && (
          <p className="text-xs leading-relaxed text-[color:var(--color-muted-foreground)]">
            {config.hintSubtitle}
          </p>
        )}

        {config.variant === "template" && (
          <p className="font-mono text-xs text-[color:var(--color-muted-foreground)]">
            {"{{ชื่อตัวแปร}}"}
          </p>
        )}

        {config.actions && config.actions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {config.actions.map((action) => (
              <Button
                key={action.id}
                type="button"
                variant={action.id === "file" ? "secondary" : "primary"}
                size="sm"
                className="pointer-events-auto"
                onClick={() => handleAction(action.action)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {config.variant === "default" && (
          <p className="text-xs text-[color:var(--color-muted-foreground)]">
            พิมพ์ {"{{ชื่อตัวแปร}}"} เพื่อสร้างตัวแปร · เปิดแผง Placeholder ที่เมนูมุมมอง
          </p>
        )}
      </div>
    </div>
  );
}

/** Decorative-only quick-start icons (default mode). */
function DefaultEmptyVisual() {
  const items = [
    { icon: Upload, label: "อัปโหลด .docx" },
    { icon: FileText, label: "วางจาก Word" },
    { icon: Keyboard, label: "พิมพ์เอง" },
  ] as const;

  return (
    <>
      <div
        aria-hidden="true"
        className="flex items-center gap-5 text-[color:var(--color-muted-foreground)]"
      >
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)] opacity-80">
              <Icon className="size-4" aria-hidden />
            </div>
            <span className="text-[11px]">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[color:var(--color-muted-foreground)]" aria-hidden="true">
        Ctrl+O เปิดไฟล์ · ลากวางไฟล์ที่นี่ · Ctrl+Shift+N เอกสารใหม่
      </p>
    </>
  );
}

function TemplateEmptyVisual({
  variant,
}: {
  variant: EmptyStateConfig["variant"];
}) {
  const Icon = variant === "template-preview" ? Eye : Braces;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--color-border)]",
        "bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)]"
      )}
    >
      <Icon className="size-6" />
    </div>
  );
}
