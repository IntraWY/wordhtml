"use client";

import { useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, FileText } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/store/editorStore";
import type { HeaderFooterConfig } from "@/types";
import { cn } from "@/lib/utils";

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

export function HeaderFooterDialog({ open, onClose }: HeaderFooterDialogProps) {
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const setPageSetup = useEditorStore((s) => s.setPageSetup);
  const headerFooter = pageSetup.headerFooter ?? DEFAULT_CONFIG;

  // Local form state — reset via key remount whenever dialog opens
  const [draft, setDraft] = useState<HeaderFooterConfig>(headerFooter);
  const [activeTab, setActiveTab] = useState<"header" | "footer">("header");

  const handleSave = () => {
    setPageSetup({ headerFooter: draft });
    onClose();
  };

  const updateField = useCallback(
    <K extends keyof HeaderFooterConfig>(key: K, value: HeaderFooterConfig[K]) => {
      setDraft((d) => ({ ...d, [key]: value }));
    },
    []
  );

  const insertVariable = useCallback(
    (variable: string) => {
      const field = activeTab === "header" ? "headerHtml" : "footerHtml";
      setDraft((d) => ({
        ...d,
        [field]: (d[field as "headerHtml"] || "") + variable,
      }));
    },
    [activeTab]
  );

  const variableButtons = [
    { label: "{page}", desc: "เลขหน้า (Page number)" },
    { label: "{total}", desc: "จำนวนหน้าทั้งหมด (Total pages)" },
    { label: "{date}", desc: "วันที่ (Date)" },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-lg">
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

          <div key={String(open)} className="space-y-5 px-5 py-4">
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
                {/* Tab switcher */}
                <div className="flex border-b border-[color:var(--color-border)]">
                  {(["header", "footer"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "relative px-4 py-2 text-sm font-medium",
                        activeTab === tab
                          ? "text-[color:var(--color-foreground)]"
                          : "text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
                      )}
                    >
                      {tab === "header" ? "ส่วนหัว (Header)" : "ส่วนท้าย (Footer)"}
                      {activeTab === tab && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--color-accent)]" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Variable buttons */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[color:var(--color-muted-foreground)]">
                    แทรกตัวแปร (Insert variable)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variableButtons.map((v) => (
                      <button
                        key={v.label}
                        type="button"
                        onClick={() => insertVariable(v.label)}
                        title={v.desc}
                        className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-2.5 py-1 text-xs font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-accent-foreground)]"
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[color:var(--color-foreground)]">
                    {activeTab === "header"
                      ? "เนื้อหาส่วนหัว (Header content)"
                      : "เนื้อหาส่วนท้าย (Footer content)"}
                  </label>
                  <textarea
                    rows={3}
                    value={activeTab === "header" ? draft.headerHtml : draft.footerHtml}
                    onChange={(e) =>
                      updateField(
                        activeTab === "header" ? "headerHtml" : "footerHtml",
                        e.target.value
                      )
                    }
                    placeholder={
                      activeTab === "header"
                        ? "เช่น บริษัท ตัวอย่าง จำกัด · หน้า {page}"
                        : "เช่น หน้า {page} จาก {total} · {date}"
                    }
                    className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--color-accent)]"
                  />
                  <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
                    รองรับ HTML และตัวแปร: {"{page}"}, {"{total}"}, {"{date}"}
                  </p>
                </div>

                {/* Options */}
                <fieldset className="space-y-3 rounded-md border border-[color:var(--color-border)] p-3">
                  <legend className="px-1 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                    ตัวเลือกเพิ่มเติม (Options)
                  </legend>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={draft.differentFirstPage}
                      onChange={(e) => updateField("differentFirstPage", e.target.checked)}
                      className="size-4 rounded border-[color:var(--color-border)] accent-[color:var(--color-accent)]"
                    />
                    <span className="text-sm">
                      หน้าแรกต่างจากหน้าอื่น (Different first page)
                    </span>
                  </label>

                  {draft.differentFirstPage && (
                    <div className="ml-7 space-y-2">
                      <label className="text-xs text-[color:var(--color-muted-foreground)]">
                        ส่วนหัวหน้าแรก (First page header)
                      </label>
                      <textarea
                        rows={2}
                        value={draft.firstPageHeaderHtml || ""}
                        onChange={(e) => updateField("firstPageHeaderHtml", e.target.value)}
                        className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
                      />
                      <label className="text-xs text-[color:var(--color-muted-foreground)]">
                        ส่วนท้ายหน้าแรก (First page footer)
                      </label>
                      <textarea
                        rows={2}
                        value={draft.firstPageFooterHtml || ""}
                        onChange={(e) => updateField("firstPageFooterHtml", e.target.value)}
                        className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={draft.differentOddEven}
                      onChange={(e) => updateField("differentOddEven", e.target.checked)}
                      className="size-4 rounded border-[color:var(--color-border)] accent-[color:var(--color-accent)]"
                    />
                    <span className="text-sm">
                      เลขคู่/คี่ต่างกัน (Different odd/even)
                    </span>
                  </label>

                  {draft.differentOddEven && (
                    <div className="ml-7 space-y-2">
                      <label className="text-xs text-[color:var(--color-muted-foreground)]">
                        ส่วนหัวเลขคู่ (Even page header)
                      </label>
                      <textarea
                        rows={2}
                        value={draft.evenHeaderHtml || ""}
                        onChange={(e) => updateField("evenHeaderHtml", e.target.value)}
                        className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
                      />
                      <label className="text-xs text-[color:var(--color-muted-foreground)]">
                        ส่วนท้ายเลขคู่ (Even page footer)
                      </label>
                      <textarea
                        rows={2}
                        value={draft.evenFooterHtml || ""}
                        onChange={(e) => updateField("evenFooterHtml", e.target.value)}
                        className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]"
                      />
                    </div>
                  )}
                </fieldset>

                {/* Preview */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[color:var(--color-muted-foreground)]">
                    ตัวอย่าง (Preview)
                  </p>
                  <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)] p-3">
                    <div className="flex items-center gap-2 text-[11px] text-[color:var(--color-muted-foreground)]">
                      <FileText className="size-3.5" />
                      <span>หน้า 1 — </span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: replaceVariables(
                            draft.headerHtml || "(ไม่มีส่วนหัว)",
                            1,
                            1
                          ),
                        }}
                      />
                    </div>
                    <div className="my-2 border-t border-dashed border-[color:var(--color-border)]" />
                    <div className="flex items-center gap-2 text-[11px] text-[color:var(--color-muted-foreground)]">
                      <FileText className="size-3.5" />
                      <span>หน้า 1 — </span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: replaceVariables(
                            draft.footerHtml || "(ไม่มีส่วนท้าย)",
                            1,
                            1
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function replaceVariables(html: string, pageNumber: number, totalPages: number): string {
  if (!html) return "";
  const date = new Date().toLocaleDateString("th-TH");
  return html
    .replace(/\{page\}/g, String(pageNumber))
    .replace(/\{total\}/g, String(totalPages))
    .replace(/\{date\}/g, date);
}
