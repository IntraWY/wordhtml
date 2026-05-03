"use client";

import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Keyboard } from "lucide-react";

interface ShortcutsPanelProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string;
  labelTh: string;
  labelEn: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: "Ctrl+S", labelTh: "บันทึก Snapshot + เปิดส่งออก", labelEn: "Save snapshot + open export" },
  { keys: "Ctrl+Shift+S", labelTh: "บันทึก Snapshot", labelEn: "Save snapshot only" },
  { keys: "Ctrl+O", labelTh: "เปิดไฟล์", labelEn: "Open file" },
  { keys: "Ctrl+Shift+N", labelTh: "เอกสารใหม่", labelEn: "New document" },
  { keys: "Ctrl+F", labelTh: "ค้นหา/แทนที่", labelEn: "Find & Replace" },
  { keys: "Ctrl+K", labelTh: "แทรกลิงก์", labelEn: "Insert link" },
  { keys: "Ctrl+P", labelTh: "พิมพ์", labelEn: "Print" },
  { keys: "F1", labelTh: "แสดงคีย์ลัด", labelEn: "Keyboard shortcuts" },
  { keys: "F11", labelTh: "เต็มจอ", labelEn: "Toggle fullscreen" },
  { keys: "Ctrl+B", labelTh: "ตัวหนา", labelEn: "Bold" },
  { keys: "Ctrl+I", labelTh: "ตัวเอียง", labelEn: "Italic" },
  { keys: "Ctrl+U", labelTh: "ขีดเส้นใต้", labelEn: "Underline" },
  { keys: "Ctrl+Z", labelTh: "เลิกทำ", labelEn: "Undo" },
  { keys: "Ctrl+Y", labelTh: "ทำซ้ำ", labelEn: "Redo" },
  { keys: "Ctrl+A", labelTh: "เลือกทั้งหมด", labelEn: "Select all" },
  { keys: "Ctrl+E", labelTh: "จัดกึ่งกลาง", labelEn: "Center align" },
  { keys: "Ctrl+Enter", labelTh: "ตัวแบ่งหน้า", labelEn: "Page break" },
];

export function ShortcutsPanel({ open, onClose }: ShortcutsPanelProps) {
  // Close on Escape — Radix Dialog handles this by default, but we keep the
  // listener for any programmatic focus edge cases.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[560px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-lg">
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
            <div className="flex items-center gap-2">
              <Keyboard className="size-4 text-[color:var(--color-muted-foreground)]" />
              <Dialog.Title className="text-base font-semibold tracking-tight">
                คีย์ลัด (Keyboard Shortcuts)
              </Dialog.Title>
            </div>
            <Dialog.Description className="sr-only">
              รายการคีย์ลัดทั้งหมดสำหรับตัวแก้ไข
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="ปิด"
                className="rounded-md p-1 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </header>

          <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-1">
              {SHORTCUTS.map((s) => (
                <div
                  key={s.keys}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-[color:var(--color-muted)]"
                >
                  <span className="text-sm text-[color:var(--color-foreground)]">
                    {s.labelTh}{" "}
                    <span className="text-[color:var(--color-muted-foreground)]">
                      ({s.labelEn})
                    </span>
                  </span>
                  <kbd className="shrink-0 rounded border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[color:var(--color-muted-foreground)]">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <footer className="flex items-center justify-end border-t border-[color:var(--color-border)] px-5 py-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md bg-[color:var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-accent-foreground)] transition-colors hover:opacity-90"
              >
                ปิด (Close)
              </button>
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
