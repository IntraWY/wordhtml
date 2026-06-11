"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/store/editorStore";
import type { PageSetup } from "@/types";
import { cn } from "@/lib/utils";

interface PageSetupDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PageSetupDialog({ open, onClose }: PageSetupDialogProps) {
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const setPageSetup = useEditorStore((s) => s.setPageSetup);

  // Local form state — reset via key remount whenever dialog opens
  const [draft, setDraft] = useState<PageSetup>(pageSetup);

  const handleSave = () => {
    setPageSetup(draft);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[480px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-lg">
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
            <Dialog.Title className="text-base font-semibold tracking-tight">
              ตั้งค่าหน้ากระดาษ (Page Setup)
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              ปรับขนาดกระดาด การวาง และระยะขอบ
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
            {/* Size */}
            <fieldset>
              <legend className="mb-2 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                ขนาดกระดาษ
              </legend>
              <div className="flex gap-2">
                {(["A4", "Letter"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={draft.size === s}
                    onClick={() => setDraft((d) => ({ ...d, size: s }))}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm font-medium",
                      draft.size === s
                        ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-background)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Orientation */}
            <fieldset>
              <legend className="mb-2 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                การวาง
              </legend>
              <div className="flex gap-2">
                {(["portrait", "landscape"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={draft.orientation === o}
                    onClick={() => setDraft((d) => ({ ...d, orientation: o }))}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm font-medium",
                      draft.orientation === o
                        ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
                        : "border-[color:var(--color-border)] bg-[color:var(--color-background)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]"
                    )}
                  >
                    {o === "portrait" ? "แนวตั้ง (Portrait)" : "แนวนอน (Landscape)"}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Margins */}
            <fieldset>
              <legend className="mb-2 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                ระยะขอบ (มม.)
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {(["top", "right", "bottom", "left"] as const).map((side) => (
                  <label key={side} className="flex flex-col gap-1 text-sm">
                    <span className="text-xs text-[color:var(--color-muted-foreground)]">
                      {{ top: "บน", right: "ขวา", bottom: "ล่าง", left: "ซ้าย" }[side]}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={draft.marginMm[side]}
                      onChange={(e) => {
                        const raw = Number.parseInt(e.target.value, 10) || 0;
                        const v = Math.min(100, Math.max(0, raw));
                        setDraft((d) => ({
                          ...d,
                          marginMm: { ...d.marginMm, [side]: v },
                        }));
                      }}
                      className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 outline-none focus:border-[color:var(--color-accent)]"
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Different first-page margins (A2) */}
            <fieldset>
              <legend className="mb-2 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                หน้าแรกต่าง (First page)
              </legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!draft.firstPageMarginMm}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      firstPageMarginMm: e.target.checked
                        ? { ...d.marginMm }
                        : undefined,
                    }))
                  }
                  className="size-4 accent-[color:var(--color-accent)]"
                />
                ใช้ระยะขอบหน้าแรกต่างจากหน้าอื่น (เช่น เว้นบนสำหรับหัวกระดาษ)
              </label>
              {draft.firstPageMarginMm && (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(["top", "right", "bottom", "left"] as const).map((side) => {
                    const fpm = draft.firstPageMarginMm ?? draft.marginMm;
                    return (
                    <label key={side} className="flex flex-col gap-1 text-sm">
                      <span className="text-xs text-[color:var(--color-muted-foreground)]">
                        {{ top: "บน", right: "ขวา", bottom: "ล่าง", left: "ซ้าย" }[side]}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={150}
                        step={1}
                        value={fpm[side]}
                        onChange={(e) => {
                          const raw = Number.parseInt(e.target.value, 10) || 0;
                          const v = Math.min(150, Math.max(0, raw));
                          setDraft((d) => ({
                            ...d,
                            firstPageMarginMm: {
                              ...(d.firstPageMarginMm ?? d.marginMm),
                              [side]: v,
                            },
                          }));
                        }}
                        className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 outline-none focus:border-[color:var(--color-accent)]"
                      />
                    </label>
                    );
                  })}
                </div>
              )}
            </fieldset>

            {/* Watermark (B4) */}
            <fieldset>
              <legend className="mb-2 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                ลายน้ำ (Watermark)
              </legend>
              <div className="mb-2 flex flex-wrap gap-2">
                {[
                  { label: "ไม่มี", value: "" },
                  { label: "ร่าง", value: "ร่าง" },
                  { label: "สำเนา", value: "สำเนา" },
                  { label: "ลับ", value: "ลับ" },
                ].map((preset) => {
                  const active = (draft.watermark?.text ?? "") === preset.value;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          watermark: preset.value
                            ? { ...d.watermark, text: preset.value }
                            : undefined,
                        }))
                      }
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm font-medium",
                        active
                          ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
                          : "border-[color:var(--color-border)] bg-[color:var(--color-background)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]"
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                aria-label="ข้อความลายน้ำกำหนดเอง (Custom watermark text)"
                placeholder="ข้อความลายน้ำกำหนดเอง…"
                value={draft.watermark?.text ?? ""}
                onChange={(e) => {
                  const text = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    watermark: text.trim()
                      ? { ...d.watermark, text }
                      : undefined,
                  }));
                }}
                className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
              />
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
