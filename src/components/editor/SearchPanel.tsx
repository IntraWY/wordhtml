"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { type Editor, useEditorState } from "@tiptap/react";

import { Button } from "@/components/ui/Button";
import { isLiveEditor } from "@/lib/editorLive";
import { goToSearchResult, getSearchResultInfo } from "@/lib/searchNavigation";

interface SearchPanelProps {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
}

type SearchCommandKey = "replace" | "replaceAll";

export function SearchPanel({ editor, open, onClose }: SearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Match counter derived reactively from the search extension's storage —
  // useEditorState re-runs the selector on every transaction (incl. the ones
  // setSearchTerm / nextSearchResult dispatch) and deep-compares the result,
  // so it updates without a setState-in-effect (react-hooks/set-state-in-effect).
  const matchInfo =
    useEditorState({
      editor,
      selector: ({ editor }) => getSearchResultInfo(editor),
    }) ?? { index: 0, total: 0 };

  // Push search term into the editor's search-and-replace extension if available.
  useEffect(() => {
    if (!isLiveEditor(editor)) return;
    editor.commands.setSearchTerm?.(searchTerm);
    editor.commands.resetIndex?.();
  }, [editor, searchTerm]);

  useEffect(() => {
    if (!isLiveEditor(editor)) return;
    editor.commands.setReplaceTerm?.(replaceTerm);
  }, [editor, replaceTerm]);

  // Focus input when opened and store previous focus.
  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Return focus on close.
  useEffect(() => {
    if (!open) {
      setTimeout(() => prevFocusRef.current?.focus(), 0);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus trap.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    panel.addEventListener("keydown", onKey);
    return () => panel.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const callCmd = (name: SearchCommandKey) => {
    if (!isLiveEditor(editor)) return;
    const cmds = editor.commands as unknown as Partial<
      Record<SearchCommandKey, () => boolean>
    >;
    cmds[name]?.();
  };

  const navigate = (direction: "next" | "previous") => {
    goToSearchResult(editor, direction);
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="ค้นหาและแทนที่ (Find & Replace)"
      className="search-panel fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-3 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-tight">
          ค้นหาและแทนที่ (Find &amp; Replace)
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="rounded-md p-1 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <label htmlFor="wordhtml-search-input" className="sr-only">
        ค้นหา (Search)
      </label>
      <input
        id="wordhtml-search-input"
        ref={inputRef}
        type="text"
        placeholder="ค้นหา…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
      />
      <label htmlFor="wordhtml-replace-input" className="sr-only">
        แทนที่ด้วย (Replace with)
      </label>
      <input
        id="wordhtml-replace-input"
        type="text"
        placeholder="แทนที่ด้วย…"
        value={replaceTerm}
        onChange={(e) => setReplaceTerm(e.target.value)}
        className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
      />
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate("previous")}
          disabled={!searchTerm || matchInfo.total === 0}
          aria-label="ก่อนหน้า (Previous match)"
        >
          <ChevronUp />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate("next")}
          disabled={!searchTerm || matchInfo.total === 0}
          aria-label="ถัดไป (Next match)"
        >
          <ChevronDown />
        </Button>
        <span
          className="px-1 text-xs tabular-nums text-[color:var(--color-muted-foreground)]"
          aria-live="polite"
        >
          {searchTerm
            ? matchInfo.total === 0
              ? "ไม่พบ"
              : `${matchInfo.index}/${matchInfo.total}`
            : ""}
        </span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => callCmd("replace")}
          disabled={!searchTerm}
        >
          แทนที่
        </Button>
        <Button
          size="sm"
          onClick={() => callCmd("replaceAll")}
          disabled={!searchTerm}
        >
          ทั้งหมด
        </Button>
      </div>
    </div>
  );
}
