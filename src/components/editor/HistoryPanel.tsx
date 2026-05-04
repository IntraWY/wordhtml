"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useEffect, useRef } from "react";
import { X, Clock, FileText, RotateCcw, Copy, Trash2, Trash } from "lucide-react";

import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import type { DocumentSnapshot } from "@/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryPanel() {
  const open = useUiStore((s) => s.historyPanelOpen);
  const close = useUiStore((s) => s.closeHistoryPanel);
  const history = useEditorStore((s) => s.history);
  const loadSnapshot = useEditorStore((s) => s.loadSnapshot);
  const duplicateSnapshot = useEditorStore((s) => s.duplicateSnapshot);
  const deleteSnapshot = useEditorStore((s) => s.deleteSnapshot);
  const renameSnapshot = useEditorStore((s) => s.renameSnapshot);
  const clearHistory = useEditorStore((s) => s.clearHistory);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(560px,92vw)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-[color:var(--color-muted-foreground)]" />
              <Dialog.Title className="text-base font-semibold tracking-tight">
                ประวัติเอกสาร
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                ดูและกู้คืน snapshot เอกสารที่บันทึกไว้
              </Dialog.Description>
            </div>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const { openConfirm } = require("@/store/dialogStore").useDialogStore.getState();
                    openConfirm(
                      "ล้างประวัติ (Clear History)",
                      "ต้องการล้างประวัติทั้งหมดหรือไม่?",
                      () => {
                        clearHistory();
                      }
                    );
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[color:var(--color-border)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-muted-foreground)] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash className="size-3" />
                  ล้างทั้งหมด
                </button>
              )}
              <Dialog.Close
                aria-label="ปิด"
                className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Clock className="size-10 text-[color:var(--color-border-strong)]" />
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  ยังไม่มีประวัติเอกสาร
                </p>
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  ระบบจะบันทึกอัตโนมัติทุกครั้งที่กด Export หรือ Ctrl+S
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[color:var(--color-border)]">
                {history.map((snap) => (
                  <SnapshotRow
                    key={snap.id}
                    snap={snap}
                    onLoad={() => loadSnapshot(snap.id)}
                    onDuplicate={() => duplicateSnapshot(snap.id)}
                    onDelete={() => deleteSnapshot(snap.id)}
                    onRename={(name) => renameSnapshot(snap.id, name)}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="shrink-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6 py-3">
            <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
              เก็บล่าสุด {history.length}/20 รายการ · บันทึกอัตโนมัติเมื่อ Export หรือ Ctrl+S
            </p>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface SnapshotRowProps {
  snap: DocumentSnapshot;
  onLoad: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string | null) => void;
}

function SnapshotRow({ snap, onLoad, onDuplicate, onDelete, onRename }: SnapshotRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(snap.fileName ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = snap.fileName ?? "เอกสารไม่มีชื่อ";

  const startEdit = () => {
    setDraft(snap.fileName ?? "");
    setEditing(true);
  };

  const commit = () => {
    const trimmed = draft.trim();
    onRename(trimmed || null);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(snap.fileName ?? "");
    setEditing(false);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  return (
    <li className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[color:var(--color-muted)] focus-within:bg-[color:var(--color-muted)]">
      <FileText className="size-8 shrink-0 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-1.5 text-[color:var(--color-muted-foreground)]" />
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            aria-label="แก้ไขชื่อเอกสาร"
            className="w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-0.5 text-sm font-medium outline-none focus:border-[color:var(--color-foreground)] focus:ring-1 focus:ring-[color:var(--color-foreground)]"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            title="คลิกเพื่อแก้ไขชื่อ"
            className="block w-full text-left"
          >
            <p className="truncate text-sm font-medium">
              {displayName}
            </p>
          </button>
        )}
        <p className="mt-0.5 text-xs text-[color:var(--color-muted-foreground)]">
          {formatDate(snap.savedAt)} · {snap.wordCount.toLocaleString()} คำ
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <ActionBtn label="โหลดเอกสาร" onClick={onLoad}>
          <RotateCcw className="size-3.5" />
        </ActionBtn>
        <ActionBtn label="ทำสำเนา" onClick={onDuplicate}>
          <Copy className="size-3.5" />
        </ActionBtn>
        <ActionBtn label="ลบ" onClick={onDelete} danger>
          <Trash2 className="size-3.5" />
        </ActionBtn>
      </div>
    </li>
  );
}

interface ActionBtnProps {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}

function ActionBtn({ label, onClick, danger, children }: ActionBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md transition-colors",
        danger
          ? "text-[color:var(--color-muted-foreground)] hover:bg-red-100 hover:text-red-600"
          : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-border)] hover:text-[color:var(--color-foreground)]"
      )}
    >
      {children}
    </button>
  );
}
