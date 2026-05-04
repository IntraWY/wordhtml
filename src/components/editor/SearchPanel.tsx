"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { Button } from "@/components/ui/Button";

interface SearchPanelProps {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
}

type SearchCommandKey =
  | "nextMatch"
  | "previousMatch"
  | "replace"
  | "replaceAll";

export function SearchPanel({ editor, open, onClose }: SearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Push search term into the editor's search-and-replace extension if available.
  useEffect(() => {
    if (!editor) return;
    editor.commands.setSearchTerm?.(searchTerm);
    editor.commands.resetIndex?.();
  }, [editor, searchTerm]);

  // Push replace term into the editor's search-and-replace extension if available.
  useEffect(() => {
    if (!editor) return;
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
    if (!editor) return;
    (editor.commands as unknown as Record<string, (() => void) | undefined>)[name]?.();
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="ค้นหาและแทนที่ (Find & Replace)"
      className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-3 shadow-lg"
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
      <input
        ref={inputRef}
        type="text"
        placeholder="ค้นหา…"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
      />
      <input
        type="text"
        placeholder="แทนที่ด้วย…"
        value={replaceTerm}
        onChange={(e) => setReplaceTerm(e.target.value)}
        className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
      />
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => callCmd("previousMatch")}
          disabled={!searchTerm}
          aria-label="ก่อนหน้า"
        >
          <ChevronUp />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => callCmd("nextMatch")}
          disabled={!searchTerm}
          aria-label="ถัดไป"
        >
          <ChevronDown />
        </Button>
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
