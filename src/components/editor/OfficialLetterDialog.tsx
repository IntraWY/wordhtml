"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, FileText } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import { clearRecoveryDraft } from "@/lib/draftRecovery";
import {
  buildOfficialLetterHtml,
  type OfficialLetterFields,
  type OfficialLetterType,
} from "@/lib/officialLetter/buildLetterHtml";
import { formatThaiDate } from "@/lib/thai/thaiFormat";

const EMPTY: OfficialLetterFields = {
  type: "external",
  bookNumber: "",
  agency: "",
  dateText: "",
  subject: "",
  to: "",
  references: "",
  attachments: "",
  body: "",
  closing: "ขอแสดงความนับถือ",
  signerName: "",
  signerPosition: "",
};

const fieldCls =
  "w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]";

export function OfficialLetterDialog() {
  const open = useUiStore((s) => s.officialLetterOpen);
  const close = useUiStore((s) => s.closeOfficialLetter);
  const [f, setF] = useState<OfficialLetterFields>(() => ({
    ...EMPTY,
    dateText: safeToday(),
  }));

  const set = <K extends keyof OfficialLetterFields>(
    key: K,
    value: OfficialLetterFields[K]
  ) => setF((prev) => ({ ...prev, [key]: value }));

  const handleCreate = () => {
    const html = buildOfficialLetterHtml(f);
    clearRecoveryDraft();
    useEditorStore.setState((state) => ({
      documentHtml: html,
      fileName: `${f.subject || "หนังสือราชการ"}.html`,
      htmlSyncRevision: state.htmlSyncRevision + 1,
    }));
    close();
  };

  const isMemo = f.type === "memo";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(620px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-xl">
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
            <div className="flex items-center gap-2">
              <FileText className="size-5" />
              <Dialog.Title className="text-base font-semibold">
                ร่างหนังสือราชการ (Official letter)
              </Dialog.Title>
            </div>
            <Dialog.Description className="sr-only">
              กรอกข้อมูลเพื่อสร้างหนังสือราชการตามระเบียบงานสารบรรณ
            </Dialog.Description>
            <Dialog.Close
              aria-label="ปิด"
              className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <div className="grid gap-3 overflow-y-auto px-6 py-4">
            {/* Type */}
            <div className="flex gap-2">
              {(
                [
                  { v: "external", l: "หนังสือภายนอก" },
                  { v: "memo", l: "บันทึกข้อความ" },
                ] as { v: OfficialLetterType; l: string }[]
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  aria-pressed={f.type === opt.v}
                  onClick={() => set("type", opt.v)}
                  className={
                    "rounded-md border px-3 py-1.5 text-sm font-medium " +
                    (f.type === opt.v
                      ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
                      : "border-[color:var(--color-border)] hover:bg-[color:var(--color-muted)]")
                  }
                >
                  {opt.l}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="เลขที่หนังสือ" value={f.bookNumber} onChange={(v) => set("bookNumber", v)} placeholder="ศธ ๐๔๐๐๑/…" />
              <Field label="ส่วนราชการ / หน่วยงาน" value={f.agency} onChange={(v) => set("agency", v)} />
              <Field label="วันที่" value={f.dateText} onChange={(v) => set("dateText", v)} />
              <Field label="เรียน" value={f.to} onChange={(v) => set("to", v)} />
            </div>

            <Field label="เรื่อง" value={f.subject} onChange={(v) => set("subject", v)} />

            {!isMemo && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="อ้างถึง (ถ้ามี)" value={f.references} onChange={(v) => set("references", v)} />
                <Field label="สิ่งที่ส่งมาด้วย (ถ้ามี)" value={f.attachments} onChange={(v) => set("attachments", v)} />
              </div>
            )}

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-[color:var(--color-muted-foreground)]">เนื้อความ</span>
              <textarea
                rows={5}
                value={f.body}
                onChange={(e) => set("body", e.target.value)}
                className={fieldCls + " resize-y font-[inherit]"}
                placeholder="พิมพ์เนื้อหาหนังสือ… (แต่ละบรรทัดจะกลายเป็นย่อหน้า)"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              {!isMemo && (
                <Field label="คำลงท้าย" value={f.closing} onChange={(v) => set("closing", v)} />
              )}
              <Field label="ชื่อผู้ลงนาม" value={f.signerName} onChange={(v) => set("signerName", v)} />
              <Field label="ตำแหน่ง" value={f.signerPosition} onChange={(v) => set("signerPosition", v)} />
            </div>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-6 py-3">
            <Button variant="secondary" size="sm" onClick={close}>
              ยกเลิก
            </Button>
            <Button size="sm" onClick={handleCreate}>
              สร้างเอกสาร
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-[color:var(--color-muted-foreground)]">{label}</span>
      <input
        type="text"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={fieldCls}
        aria-label={label}
      />
    </label>
  );
}

/** Today's date as a Thai Buddhist-era string; falls back to empty on error. */
function safeToday(): string {
  try {
    return formatThaiDate(new Date(), { digits: "thai", era: "be", month: "long" });
  } catch {
    return "";
  }
}
