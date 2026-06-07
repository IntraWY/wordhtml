"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import { useToastStore } from "@/store/toastStore";
import {
  downloadDistributionZip,
  parseRecipientList,
} from "@/lib/export/distributionList";

/**
 * Distribution list / สำเนาเรียน (C3). Takes the current document as a template
 * (with a {{เรียน}} placeholder) and a list of recipients, then downloads one
 * document per recipient as a ZIP.
 */
export function DistributionDialog() {
  const open = useUiStore((s) => s.distributionOpen);
  const close = useUiStore((s) => s.closeDistribution);
  const [fieldName, setFieldName] = useState("เรียน");
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);

  const recipients = parseRecipientList(raw);

  const handleGenerate = async () => {
    const { documentHtml, pageSetup } = useEditorStore.getState();
    if (recipients.length === 0) {
      useToastStore.getState().show("กรุณาใส่รายชื่อผู้รับอย่างน้อย 1 ราย", "error");
      return;
    }
    if (!documentHtml.includes(`{{${fieldName}}}`)) {
      useToastStore
        .getState()
        .show(`ไม่พบ {{${fieldName}}} ในเอกสาร — เพิ่มตัวแปรก่อน`, "error");
      return;
    }
    setBusy(true);
    try {
      await downloadDistributionZip({
        templateHtml: documentHtml,
        recipients,
        pageSetup,
        fieldName,
        zipName: "distribution.zip",
      });
      useToastStore.getState().show(`สร้าง ${recipients.length} ฉบับแล้ว`);
      close();
    } catch {
      useToastStore.getState().show("สร้างเอกสารไม่สำเร็จ", "error");
    } finally {
      setBusy(false);
    }
  };

  const fieldCls =
    "w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 text-sm outline-none focus:border-[color:var(--color-accent)]";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(520px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-xl">
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
            <div className="flex items-center gap-2">
              <Users className="size-5" />
              <Dialog.Title className="text-base font-semibold">
                สำเนาเรียน / รายชื่อผู้รับ (Distribution)
              </Dialog.Title>
            </div>
            <Dialog.Description className="sr-only">
              สร้างหนังสือทีละฉบับสำหรับผู้รับหลายราย แล้วดาวน์โหลดเป็น ZIP
            </Dialog.Description>
            <Dialog.Close
              aria-label="ปิด"
              className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <div className="grid gap-3 overflow-y-auto px-5 py-4">
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              ใส่ <code>{`{{${fieldName}}}`}</code> ในเอกสารตรงที่ต้องการให้แทนชื่อผู้รับ
              จากนั้นใส่รายชื่อ (บรรทัดละชื่อ หรือคั่นด้วยจุลภาค)
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-[color:var(--color-muted-foreground)]">
                ชื่อตัวแปรผู้รับ (Placeholder field)
              </span>
              <input
                type="text"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                className={fieldCls}
                aria-label="ชื่อตัวแปรผู้รับ"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-[color:var(--color-muted-foreground)]">
                รายชื่อผู้รับ ({recipients.length} ราย)
              </span>
              <textarea
                rows={7}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={"ผู้อำนวยการสำนัก ก\nผู้อำนวยการสำนัก ข\n…"}
                className={fieldCls + " resize-y"}
                aria-label="รายชื่อผู้รับ"
              />
            </label>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-5 py-3">
            <Button variant="secondary" size="sm" onClick={close} disabled={busy}>
              ยกเลิก
            </Button>
            <Button size="sm" onClick={handleGenerate} disabled={busy} aria-busy={busy}>
              {busy ? "กำลังสร้าง…" : `สร้าง ${recipients.length || ""} ฉบับ (ZIP)`}
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
