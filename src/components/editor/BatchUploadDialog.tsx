"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, FileUp, Loader2, FileText } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { batchConvert } from "@/lib/batchConvert";
import { triggerDownload } from "@/lib/export/wrap";

export function BatchUploadDialog() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setFiles([]);
      setProgress("");
    };
    window.addEventListener("wordhtml:open-batch-convert", handler);
    return () => {
      window.removeEventListener("wordhtml:open-batch-convert", handler);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = useCallback(async () => {
    if (files.length === 0 || busy) return;
    setBusy(true);
    setProgress("");

    try {
      const blob = await batchConvert(files);
      triggerDownload(blob, `batch-convert-${Date.now()}.zip`);
      setProgress("เสร็จสิ้น (Done)");
    } catch (err) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด (Error)";
      setProgress(message);
    } finally {
      setBusy(false);
    }
  }, [files, busy]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : setOpen(false))}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(520px,92vw)] max-h-[88vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]">
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight">
                แปลงเป็นกลุ่ม (Batch Convert)
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                เลือกไฟล์ .docx หลายไฟล์เพื่อแปลงเป็น HTML และบรรจุเป็น ZIP
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="ปิด"
              className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <div className="flex flex-col gap-4 px-6 py-5">
            {/* File input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[color:var(--color-muted-foreground)]">
                เลือกไฟล์ .docx (Select .docx files)
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                >
                  <FileUp className="size-4" />
                  เลือกไฟล์ (Browse)
                </Button>
                <span className="text-xs text-[color:var(--color-muted-foreground)]">
                  {files.length > 0
                    ? `เลือกแล้ว ${files.length} ไฟล์ (${files.length} selected)`
                    : "ยังไม่ได้เลือกไฟล์ (No files selected)"}
                </span>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".docx"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <ul className="max-h-48 overflow-auto rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-2 py-1">
                {files.map((file, idx) => (
                  <li
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-[color:var(--color-foreground)]"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <FileText className="size-3.5 shrink-0 text-[color:var(--color-muted-foreground)]" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      disabled={busy}
                      className="shrink-0 rounded p-1 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      aria-label={`ลบ ${file.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Progress */}
            {progress && (
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                {progress}
              </p>
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6 py-4">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              ยกเลิก (Cancel)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConvert}
              disabled={files.length === 0 || busy}
            >
              {busy ? (
                <>
                  <Loader2 className="animate-spin" />
                  กำลังแปลง… (Converting)
                </>
              ) : (
                <>เริ่มแปลง (Convert)</>
              )}
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
