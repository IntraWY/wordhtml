"use client";

import { useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, FileText } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/store/editorStore";
import type { HeaderFooterConfig } from "@/types";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { replacePageTokens } from "@/lib/placeholders";
import { HeaderFooterRichEditor } from "./HeaderFooterRichEditor";

interface HeaderFooterDialogProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_CONFIG: HeaderFooterConfig = {
  enabled: false,
  headerHtml: "",
  footerHtml: "หน้า {page} จาก {total}",
  differentFirstPage: false,
  differentOddEven: false,
  firstPageHeaderHtml: "",
  firstPageFooterHtml: "",
  evenHeaderHtml: "",
  evenFooterHtml: "",
};

type Variant = "all" | "first" | "even";

const VARIANT_FIELDS: Record<
  Variant,
  { header: keyof HeaderFooterConfig; footer: keyof HeaderFooterConfig }
> = {
  all: { header: "headerHtml", footer: "footerHtml" },
  first: { header: "firstPageHeaderHtml", footer: "firstPageFooterHtml" },
  even: { header: "evenHeaderHtml", footer: "evenFooterHtml" },
};

const HTML_FIELDS = [
  "headerHtml",
  "footerHtml",
  "firstPageHeaderHtml",
  "firstPageFooterHtml",
  "evenHeaderHtml",
  "evenFooterHtml",
] as const;

export function HeaderFooterDialog({ open, onClose }: HeaderFooterDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[620px] max-w-[94vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
            <Dialog.Title className="text-base font-semibold tracking-tight">
              หัวกระดาษ/ท้ายกระดาษ (Header & Footer)
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              ตั้งค่าส่วนหัวและส่วนท้ายของเอกสาร รวมถึงเลขหน้า
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
          {/* The form unmounts with the portal on close, so each open seeds a
              fresh draft from the store — no stale state, no sync effect. */}
          <HeaderFooterForm onClose={onClose} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HeaderFooterForm({ onClose }: { onClose: () => void }) {
  const setPageSetup = useEditorStore((s) => s.setPageSetup);

  const [draft, setDraft] = useState<HeaderFooterConfig>(
    () => useEditorStore.getState().pageSetup.headerFooter ?? DEFAULT_CONFIG
  );
  const [activeVariant, setActiveVariant] = useState<Variant>("all");

  const handleSave = () => {
    const sanitized = { ...draft };
    for (const field of HTML_FIELDS) {
      const raw = sanitized[field];
      if (typeof raw === "string" && raw) {
        sanitized[field] = sanitizeHtml(raw) as never;
      }
    }
    setPageSetup({ headerFooter: sanitized });
    onClose();
  };

  const updateField = useCallback(
    <K extends keyof HeaderFooterConfig>(key: K, value: HeaderFooterConfig[K]) => {
      setDraft((d) => ({ ...d, [key]: value }));
    },
    []
  );

  const variantTabs: { id: Variant; label: string; visible: boolean }[] = [
    { id: "all", label: "ทุกหน้า (All pages)", visible: true },
    {
      id: "first",
      label: "หน้าแรก (First page)",
      visible: draft.differentFirstPage,
    },
    {
      id: "even",
      label: "หน้าคู่ (Even pages)",
      visible: draft.differentOddEven,
    },
  ];

  // If the active tab's checkbox gets unticked, fall back to the base tab.
  const effectiveVariant = variantTabs.find((t) => t.id === activeVariant)?.visible
    ? activeVariant
    : "all";
  const fields = VARIANT_FIELDS[effectiveVariant];
  const headerValue = (draft[fields.header] as string) || "";
  const footerValue = (draft[fields.footer] as string) || "";

  return (
    <>
      <div className="space-y-5 px-5 py-4">
            {/* Enable toggle */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => updateField("enabled", e.target.checked)}
                className="size-4 rounded border-[color:var(--color-border)] accent-[color:var(--color-accent)]"
              />
              <span className="text-sm font-medium">
                เปิดใช้งานส่วนหัว/ท้ายกระดาษ (Enable Header & Footer)
              </span>
            </label>

            {draft.enabled && (
              <>
                {/* Options */}
                <fieldset className="space-y-2 rounded-md border border-[color:var(--color-border)] p-3">
                  <legend className="px-1 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                    ตัวเลือกเพิ่มเติม (Options)
                  </legend>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={draft.differentFirstPage}
                      onChange={(e) =>
                        updateField("differentFirstPage", e.target.checked)
                      }
                      className="size-4 rounded border-[color:var(--color-border)] accent-[color:var(--color-accent)]"
                    />
                    <span className="text-sm">
                      หน้าแรกต่างจากหน้าอื่น (Different first page)
                    </span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={draft.differentOddEven}
                      onChange={(e) =>
                        updateField("differentOddEven", e.target.checked)
                      }
                      className="size-4 rounded border-[color:var(--color-border)] accent-[color:var(--color-accent)]"
                    />
                    <span className="text-sm">
                      เลขคู่/คี่ต่างกัน (Different odd/even)
                    </span>
                  </label>
                </fieldset>

                {/* Variant tabs */}
                <div
                  className="flex border-b border-[color:var(--color-border)]"
                  role="tablist"
                  aria-label="ชุดหัว/ท้ายกระดาษ (Header/footer variants)"
                >
                  {variantTabs
                    .filter((t) => t.visible)
                    .map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={effectiveVariant === tab.id}
                        onClick={() => setActiveVariant(tab.id)}
                        className={cn(
                          "relative px-4 py-2 text-sm font-medium",
                          effectiveVariant === tab.id
                            ? "text-[color:var(--color-foreground)]"
                            : "text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
                        )}
                      >
                        {tab.label}
                        {effectiveVariant === tab.id && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--color-accent)]" />
                        )}
                      </button>
                    ))}
                </div>

                {/* Rich editors for the active variant — keyed so each tab
                    mounts a fresh editor seeded from the current draft. */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">
                      เนื้อหาส่วนหัว (Header content)
                    </p>
                    <HeaderFooterRichEditor
                      key={`header-${effectiveVariant}`}
                      value={headerValue}
                      onChange={(html) =>
                        updateField(fields.header, html as never)
                      }
                      ariaLabel="แก้ไขส่วนหัวกระดาษ (Edit header)"
                      placeholder="เช่น บริษัท ตัวอย่าง จำกัด · หน้า {page}"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">
                      เนื้อหาส่วนท้าย (Footer content)
                    </p>
                    <HeaderFooterRichEditor
                      key={`footer-${effectiveVariant}`}
                      value={footerValue}
                      onChange={(html) =>
                        updateField(fields.footer, html as never)
                      }
                      ariaLabel="แก้ไขส่วนท้ายกระดาษ (Edit footer)"
                      placeholder="เช่น หน้า {page} จาก {total} · {date}"
                    />
                  </div>
                  <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
                    ตัวแปร {"{page}"}, {"{total}"}, {"{date_th}"} ฯลฯ
                    จะถูกแทนค่าจริงบนกระดาษและตอนส่งออก
                  </p>
                </div>

                {/* Preview (page 1, base variant) */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[color:var(--color-muted-foreground)]">
                    ตัวอย่าง (Preview)
                  </p>
                  <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)] p-3">
                    <div className="flex items-center gap-2 text-[11px] text-[color:var(--color-muted-foreground)]">
                      <FileText className="size-3.5 shrink-0" />
                      <span className="shrink-0">หน้า 1 — </span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(
                            replacePageTokens(
                              (draft.differentFirstPage
                                ? draft.firstPageHeaderHtml
                                : draft.headerHtml) || "(ไม่มีส่วนหัว)",
                              { pageNumber: 1, totalPages: 1 }
                            )
                          ),
                        }}
                      />
                    </div>
                    <div className="my-2 border-t border-dashed border-[color:var(--color-border)]" />
                    <div className="flex items-center gap-2 text-[11px] text-[color:var(--color-muted-foreground)]">
                      <FileText className="size-3.5 shrink-0" />
                      <span className="shrink-0">หน้า 1 — </span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(
                            replacePageTokens(
                              (draft.differentFirstPage
                                ? draft.firstPageFooterHtml
                                : draft.footerHtml) || "(ไม่มีส่วนท้าย)",
                              { pageNumber: 1, totalPages: 1 }
                            )
                          ),
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-5 py-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button size="sm" onClick={handleSave}>
              บันทึก
            </Button>
          </footer>
    </>
  );
}
