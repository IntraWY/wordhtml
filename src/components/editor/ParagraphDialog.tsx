"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { Editor } from "@tiptap/react";
import type { ParagraphFormatValues, LineHeightMode } from "@/lib/tiptap/paragraphFormat";

interface ParagraphDialogProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
}

const LINE_HEIGHT_OPTIONS: { label: string; value: LineHeightMode }[] = [
  { label: "เดี่ยว", value: "single" },
  { label: "1.5", value: "oneHalf" },
  { label: "คู่", value: "double" },
  { label: "อย่างน้อย", value: "atLeast" },
  { label: "แน่นอน", value: "exactly" },
  { label: "หลายเท่า", value: "multiple" },
];

function readCurrentFormat(editor: Editor | null): ParagraphFormatValues {
  if (!editor) return {};
  const p = editor.getAttributes("paragraph") as Record<string, unknown>;
  const h = editor.getAttributes("heading") as Record<string, unknown>;
  return {
    marginLeft: (p.marginLeft as number) ?? (h.marginLeft as number) ?? 0,
    marginRight: (p.marginRight as number) ?? (h.marginRight as number) ?? 0,
    textIndent: (p.textIndent as number) ?? (h.textIndent as number) ?? 0,
    spaceBefore: (p.spaceBefore as number) ?? (h.spaceBefore as number) ?? 0,
    spaceAfter: (p.spaceAfter as number) ?? (h.spaceAfter as number) ?? 0,
    lineHeightMode: (p.lineHeightMode as LineHeightMode) ?? (h.lineHeightMode as LineHeightMode) ?? undefined,
    lineHeight: (p.lineHeight as number) ?? (h.lineHeight as number) ?? undefined,
  };
}

function lineHeightCss(mode: LineHeightMode | undefined, value: number | undefined): string | undefined {
  switch (mode) {
    case "single":
      return "1.15";
    case "oneHalf":
      return "1.5";
    case "double":
      return "2";
    case "atLeast":
    case "exactly":
      return value != null ? `${value}pt` : undefined;
    case "multiple":
      return value != null ? `${value}` : undefined;
    default:
      return undefined;
  }
}

function buildPreviewStyle(draft: ParagraphFormatValues): React.CSSProperties {
  return {
    marginLeft: draft.marginLeft ? `${draft.marginLeft}cm` : undefined,
    marginRight: draft.marginRight ? `${draft.marginRight}cm` : undefined,
    textIndent: draft.textIndent ? `${draft.textIndent}cm` : undefined,
    marginTop: draft.spaceBefore ? `${draft.spaceBefore}pt` : undefined,
    marginBottom: draft.spaceAfter ? `${draft.spaceAfter}pt` : undefined,
    lineHeight: lineHeightCss(draft.lineHeightMode, draft.lineHeight ?? undefined),
  };
}

export function ParagraphDialog({ open, onClose, editor }: ParagraphDialogProps) {
  const [draft, setDraft] = useState<ParagraphFormatValues>(() => readCurrentFormat(editor));

  useEffect(() => {
    if (open) {
      setDraft(readCurrentFormat(editor));
    }
  }, [open, editor]);

  const handleSave = () => {
    if (!editor) return;
    editor.chain().focus().setParagraphFormat(draft).run();
    onClose();
  };

  const handleReset = () => {
    setDraft({
      marginLeft: 0,
      marginRight: 0,
      textIndent: 0,
      spaceBefore: 0,
      spaceAfter: 0,
      lineHeightMode: undefined,
      lineHeight: undefined,
    });
  };

  const needsValue = draft.lineHeightMode === "atLeast" || draft.lineHeightMode === "exactly" || draft.lineHeightMode === "multiple";

  const previewStyle = useMemo(() => buildPreviewStyle(draft), [draft]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[720px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-lg">
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
            <Dialog.Title className="text-base font-semibold tracking-tight">
              ย่อหน้า (Paragraph)
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              ปรับการเยื้องและระยะห่างของย่อหน้า
            </Dialog.Description>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-xs" title="รีเซ็ตเป็นค่าเริ่มต้น">
                <RotateCcw className="size-3.5" />
                รีเซ็ต
              </Button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="ปิด"
                  className="rounded-md p-1 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
                >
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>
          </header>

          <div key={String(open)} className="flex flex-col gap-5 px-5 py-4 md:flex-row">
            {/* Left: Controls */}
            <div className="flex-1 space-y-5">
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
                        <span className="shrink-0 text-xs text-[color:var(--color-muted-foreground)]">{unit}</span>
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
                        <span className="shrink-0 text-xs text-[color:var(--color-muted-foreground)]">{unit}</span>
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
                <div className="flex flex-wrap gap-2">
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

            {/* Right: Live Preview */}
            <div className="w-full shrink-0 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/40 p-4 md:w-64">
              <div className="mb-2 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                ตัวอย่าง (Preview)
              </div>
              <div className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-3">
                <p style={previewStyle} className="text-sm leading-normal text-[color:var(--color-foreground)]">
                  ตัวอย่างข้อความสำหรับดูผลลัพธ์การจัดรูปแบบย่อหน้าแบบเรียลไทม์
                </p>
              </div>
              <div className="mt-2 text-[10px] text-[color:var(--color-muted-foreground)]">
                {draft.lineHeightMode && (
                  <div>
                    ระยะบรรทัด: {LINE_HEIGHT_OPTIONS.find((o) => o.value === draft.lineHeightMode)?.label}
                    {needsValue && draft.lineHeight != null ? ` (${draft.lineHeight})` : ""}
                  </div>
                )}
                {(draft.marginLeft || 0) > 0 && <div>เยื้องซ้าย: {draft.marginLeft} cm</div>}
                {(draft.textIndent || 0) > 0 && <div>เยื้องบรรทัดแรก: {draft.textIndent} cm</div>}
              </div>
            </div>
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
