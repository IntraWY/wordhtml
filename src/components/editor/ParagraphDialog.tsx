"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { Editor } from "@tiptap/react";
import type { ParagraphFormatValues, LineHeightMode } from "@/lib/tiptap/paragraphFormat";

interface ParagraphDialogProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
}

const LINE_HEIGHT_OPTIONS: { label: string; value: LineHeightMode }[] = [
  { label: "เดี่ยว (Single)", value: "single" },
  { label: "1.5 บรรทัด (1.5 Lines)", value: "oneHalf" },
  { label: "คู่ (Double)", value: "double" },
  { label: "อย่างน้อย (At least)", value: "atLeast" },
  { label: "แน่นอน (Exactly)", value: "exactly" },
  { label: "หลายเท่า (Multiple)", value: "multiple" },
];

function readCurrentFormat(editor: Editor | null): ParagraphFormatValues {
  if (!editor) return {};
  const attrs = editor.getAttributes("paragraph") as Record<string, unknown>;
  return {
    marginLeft: (attrs.marginLeft as number) ?? 0,
    marginRight: (attrs.marginRight as number) ?? 0,
    textIndent: (attrs.textIndent as number) ?? 0,
    spaceBefore: (attrs.spaceBefore as number) ?? 0,
    spaceAfter: (attrs.spaceAfter as number) ?? 0,
    lineHeightMode: (attrs.lineHeightMode as LineHeightMode) ?? undefined,
    lineHeight: (attrs.lineHeight as number) ?? undefined,
  };
}

export function ParagraphDialog({ open, onClose, editor }: ParagraphDialogProps) {
  const [draft, setDraft] = useState<ParagraphFormatValues>(() => readCurrentFormat(editor));

  const handleSave = () => {
    if (!editor) return;
    editor.chain().focus().setParagraphFormat(draft).run();
    onClose();
  };

  const needsValue = draft.lineHeightMode === "atLeast" || draft.lineHeightMode === "exactly" || draft.lineHeightMode === "multiple";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[480px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-lg">
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
            <Dialog.Title className="text-base font-semibold tracking-tight">
              ย่อหน้า (Paragraph)
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              ปรับการเยื้องและระยะห่างของย่อหน้า
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

          <div key={String(open)} className="space-y-5 px-5 py-4">
            {/* Indents */}
            <fieldset>
              <legend className="mb-2 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                เยื้อง (Indents)
              </legend>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "marginLeft", label: "ซ้าย (Left)", unit: "cm" },
                  { key: "marginRight", label: "ขวา (Right)", unit: "cm" },
                  { key: "textIndent", label: "บรรทัดแรก (First line)", unit: "cm" },
                ].map(({ key, label, unit }) => (
                  <label key={key} className="flex flex-col gap-1 text-sm">
                    <span className="text-xs text-[color:var(--color-muted-foreground)]">{label}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step={0.1}
                        min={-10}
                        max={50}
                        value={draft[key as keyof ParagraphFormatValues] ?? 0}
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value) || 0;
                          setDraft((d) => ({ ...d, [key]: v }));
                        }}
                        className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 outline-none focus:border-[color:var(--color-accent)]"
                      />
                      <span className="text-xs text-[color:var(--color-muted-foreground)] shrink-0">{unit}</span>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Spacing */}
            <fieldset>
              <legend className="mb-2 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                ระยะห่าง (Spacing)
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "spaceBefore", label: "ก่อน (Before)", unit: "pt" },
                  { key: "spaceAfter", label: "หลัง (After)", unit: "pt" },
                ].map(({ key, label, unit }) => (
                  <label key={key} className="flex flex-col gap-1 text-sm">
                    <span className="text-xs text-[color:var(--color-muted-foreground)]">{label}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step={1}
                        min={0}
                        max={200}
                        value={draft[key as keyof ParagraphFormatValues] ?? 0}
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value) || 0;
                          setDraft((d) => ({ ...d, [key]: v }));
                        }}
                        className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 outline-none focus:border-[color:var(--color-accent)]"
                      />
                      <span className="text-xs text-[color:var(--color-muted-foreground)] shrink-0">{unit}</span>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Line height */}
            <fieldset>
              <legend className="mb-2 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                ระยะบรรทัด (Line Height)
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {LINE_HEIGHT_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, lineHeightMode: value }))}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                      draft.lineHeightMode === value
                        ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-background)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {needsValue && (
                <label className="mt-3 flex flex-col gap-1 text-sm">
                  <span className="text-xs text-[color:var(--color-muted-foreground)]">ค่า (Value)</span>
                  <input
                    type="number"
                    step={draft.lineHeightMode === "multiple" ? 0.1 : 1}
                    min={0}
                    value={draft.lineHeight ?? ""}
                    onChange={(e) => {
                      const v = Number.parseFloat(e.target.value);
                      setDraft((d) => ({
                        ...d,
                        lineHeight: Number.isNaN(v) ? undefined : v,
                      }));
                    }}
                    className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 outline-none focus:border-[color:var(--color-accent)]"
                  />
                </label>
              )}
            </fieldset>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-5 py-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button size="sm" onClick={handleSave}>
              บันทึก
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
