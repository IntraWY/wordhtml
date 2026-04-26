"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  FileCode2,
  FileArchive,
  FileText,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/store/editorStore";
import { applyCleaners } from "@/lib/cleaning/pipeline";
import { downloadHtml } from "@/lib/export/exportHtml";
import { downloadZip } from "@/lib/export/exportZip";
import { downloadDocx } from "@/lib/export/exportDocx";
import { CLEANERS, type ExportFormat, type ImageMode } from "@/types";
import { cn } from "@/lib/utils";

type ExportKind = ExportFormat;

export function ExportDialog() {
  const open = useEditorStore((s) => s.exportDialogOpen);
  const close = useEditorStore((s) => s.closeExportDialog);
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const enabledCleaners = useEditorStore((s) => s.enabledCleaners);
  const imageMode = useEditorStore((s) => s.imageMode);
  const setImageMode = useEditorStore((s) => s.setImageMode);
  const fileName = useEditorStore((s) => s.fileName);
  const pendingFormat = useEditorStore((s) => s.pendingExportFormat);

  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [copied, setCopied] = useState(false);
  // Track which format is highlighted as primary. When the dialog is opened
  // with a pre-selected format (via openExportDialog(format)), default to it.
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(
    pendingFormat ?? "html"
  );

  useEffect(() => {
    if (pendingFormat) setSelectedFormat(pendingFormat);
  }, [pendingFormat]);

  const cleanedHtml = useMemo(
    () => applyCleaners(documentHtml, enabledCleaners),
    [documentHtml, enabledCleaners]
  );

  const activeCleaners = useMemo(
    () => CLEANERS.filter((c) => enabledCleaners.includes(c.key)),
    [enabledCleaners]
  );

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanedHtml);
      setCopied(true);
    } catch {
      // ignore clipboard rejection
    }
  };

  const handleDownload = async (kind: ExportKind) => {
    if (busy) return;
    setBusy(kind);
    try {
      const opts = { sourceName: fileName };
      if (kind === "html") {
        if (imageMode === "separate") {
          await downloadZip(cleanedHtml, opts);
        } else {
          downloadHtml(cleanedHtml, opts);
        }
      } else if (kind === "zip") {
        await downloadZip(cleanedHtml, opts);
      } else {
        await downloadDocx(cleanedHtml, opts);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 grid w-[min(900px,92vw)] max-h-[88vh] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]"
          aria-describedby={undefined}
        >
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight">
                ส่งออก HTML
              </Dialog.Title>
              <p className="mt-0.5 text-xs text-[color:var(--color-muted-foreground)]">
                {activeCleaners.length === 0
                  ? "ไม่มีตัวทำความสะอาดที่เปิดใช้"
                  : `เปิดใช้ตัวทำความสะอาด ${activeCleaners.length} รายการ: ${activeCleaners
                      .map((c) => c.label)
                      .join(", ")}`}
              </p>
            </div>
            <Dialog.Close
              aria-label="ปิด"
              className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                ตัวอย่าง
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1 text-xs font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
              >
                {copied ? <Check className="size-3.5 text-[color:var(--color-success)]" /> : <Copy className="size-3.5" />}
                {copied ? "คัดลอกแล้ว" : "คัดลอก"}
              </button>
            </div>
            <pre className="m-0 flex-1 overflow-auto bg-[color:var(--color-background)] p-6 font-mono text-xs leading-relaxed text-[color:var(--color-foreground)]">
              <code>{cleanedHtml || "<!-- เอกสารว่างเปล่า -->"}</code>
            </pre>
          </div>

          <footer className="flex flex-col gap-4 border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6 py-4">
            <ImageModeToggle imageMode={imageMode} onChange={setImageMode} />

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant={selectedFormat === "docx" ? "primary" : "secondary"}
                onClick={() => {
                  setSelectedFormat("docx");
                  handleDownload("docx");
                }}
                disabled={busy !== null}
              >
                {busy === "docx" ? <Loader2 className="animate-spin" /> : <FileText />}
                ดาวน์โหลด .docx
              </Button>
              <Button
                variant={selectedFormat === "zip" ? "primary" : "secondary"}
                onClick={() => {
                  setSelectedFormat("zip");
                  handleDownload("zip");
                }}
                disabled={busy !== null}
              >
                {busy === "zip" ? <Loader2 className="animate-spin" /> : <FileArchive />}
                ดาวน์โหลด .zip
              </Button>
              <Button
                variant={selectedFormat === "html" ? "primary" : "secondary"}
                onClick={() => {
                  setSelectedFormat("html");
                  handleDownload("html");
                }}
                disabled={busy !== null}
              >
                {busy === "html" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <FileCode2 />
                )}
                ดาวน์โหลด .html
              </Button>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ImageModeToggleProps {
  imageMode: ImageMode;
  onChange: (mode: ImageMode) => void;
}

function ImageModeToggle({ imageMode, onChange }: ImageModeToggleProps) {
  const options: { value: ImageMode; label: string; hint: string }[] = [
    { value: "inline", label: "Inline (base64)", hint: "ไฟล์เดียวครบในตัว" },
    { value: "separate", label: "แยกไฟล์ (ZIP)", hint: "HTML เล็กลง รูปภาพแยกต่างหาก" },
  ];

  return (
    <fieldset className="flex flex-wrap items-center gap-3 text-xs">
      <legend className="mr-1 text-[color:var(--color-muted-foreground)]">
        รูปภาพ:
      </legend>
      {options.map((opt) => {
        const active = imageMode === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors",
              active
                ? "border-[color:var(--color-foreground)] bg-[color:var(--color-background)] text-[color:var(--color-foreground)]"
                : "border-[color:var(--color-border)] bg-[color:var(--color-background)]/50 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
            )}
          >
            <input
              type="radio"
              name="image-mode"
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "grid h-3.5 w-3.5 place-items-center rounded-full border",
                active
                  ? "border-[color:var(--color-foreground)]"
                  : "border-[color:var(--color-border-strong)]"
              )}
            >
              {active && (
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-foreground)]" />
              )}
            </span>
            <span className="font-medium">{opt.label}</span>
            <span className="text-[10px] text-[color:var(--color-muted-foreground)]">
              · {opt.hint}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
