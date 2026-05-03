"use client";

import { useEffect, useMemo } from "react";
import { X, List } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useEditorStore } from "@/store/editorStore";
import { generateToc } from "@/lib/toc";

interface TableOfContentsPanelProps {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
}

export function TableOfContentsPanel({
  editor,
  open,
  onClose,
}: TableOfContentsPanelProps) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const items = useMemo(() => generateToc(documentHtml), [documentHtml]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleClick = (id: string) => {
    if (!editor) return;
    let targetPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading" && node.attrs.id === id) {
        targetPos = pos;
        return false;
      }
      return;
    });
    if (targetPos !== null) {
      editor.chain().focus().setTextSelection(targetPos + 1).run();
      try {
        const dom = editor.view.nodeDOM(targetPos) as HTMLElement | null;
        dom?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        // ignore scroll errors
      }
    }
    onClose();
  };

  return (
    <div className="fixed top-16 right-4 z-50 flex w-80 max-h-[70vh] flex-col rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-lg">
      <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <List className="size-4 text-[color:var(--color-muted-foreground)]" />
          <span className="text-sm font-semibold tracking-tight">
            สารบัญ (Table of Contents)
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="rounded-md p-1 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="px-2 py-4 text-sm text-[color:var(--color-muted-foreground)] text-center">
            ไม่พบหัวข้อในเอกสาร
          </p>
        ) : (
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleClick(item.id)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
                  style={{
                    paddingLeft: `${0.75 + (item.level - 1) * 0.75}rem`,
                  }}
                >
                  {item.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
