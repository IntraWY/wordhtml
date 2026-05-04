"use client";

import { useRef, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialogStore } from "@/store/dialogStore";

export function DialogSystem() {
  const open = useDialogStore((s) => s.open);
  const type = useDialogStore((s) => s.type);
  const title = useDialogStore((s) => s.title);
  const message = useDialogStore((s) => s.message);
  const defaultValue = useDialogStore((s) => s.defaultValue);
  const onConfirm = useDialogStore((s) => s.onConfirm);
  const onCancel = useDialogStore((s) => s.onCancel);
  const onSubmit = useDialogStore((s) => s.onSubmit);
  const close = useDialogStore((s) => s.close);

  const [inputValue, setInputValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setInputValue(defaultValue);
  }, [open, defaultValue]);

  useEffect(() => {
    if (open && type === "prompt") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, type]);

  const handleConfirm = () => {
    onConfirm?.();
    close();
  };

  const handleCancel = () => {
    onCancel?.();
    close();
  };

  const handleSubmit = () => {
    onSubmit?.(inputValue);
    close();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[100] w-[min(400px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]"
          onOpenAutoFocus={(e) => {
            if (type !== "prompt") e.preventDefault();
          }}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold tracking-tight">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="ปิด"
              onClick={handleCancel}
              className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            {message}
          </Dialog.Description>
          <p className="mt-3 text-sm text-[color:var(--color-foreground)]">
            {message}
          </p>

          {type === "prompt" && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") handleCancel();
              }}
              className="mt-3 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--color-foreground)] focus:ring-2 focus:ring-[color:var(--color-foreground)]"
            />
          )}

          <div className="mt-5 flex justify-end gap-2">
            {type !== "alert" && (
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
              >
                ยกเลิก (Cancel)
              </button>
            )}
            <button
              type="button"
              onClick={type === "prompt" ? handleSubmit : handleConfirm}
              className={cn(
                "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                type === "confirm"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-[color:var(--color-foreground)] text-[color:var(--color-background)] hover:bg-[color:var(--color-accent-hover)]"
              )}
            >
              {type === "confirm"
                ? "ยืนยัน (Confirm)"
                : type === "prompt"
                ? "ตกลง (OK)"
                : "ตกลง (OK)"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
