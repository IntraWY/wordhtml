"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { RecoveryDraft } from "@/lib/draftRecovery";

interface RecoveryDialogProps {
  open: boolean;
  draft: RecoveryDraft | null;
  onRestore: () => void;
  onDiscard: () => void;
  onOptOut: () => void;
}

export function RecoveryDialog({
  open,
  draft,
  onRestore,
  onDiscard,
  onOptOut,
}: RecoveryDialogProps) {
  const savedLabel = draft?.savedAt
    ? new Date(draft.savedAt).toLocaleString("th-TH")
    : "";

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[60] w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-6 shadow-xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color:var(--color-muted)]">
              <FileText className="size-5 text-[color:var(--color-foreground)]" />
            </div>
            <div>
              <Dialog.Title className="text-base font-semibold">
                กู้เอกสารที่ยังไม่บันทึก? (Recover draft)
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
                พบฉบับร่างที่บันทึกไว้ในเครื่องของคุณเมื่อ {savedLabel || "—"}.
                ข้อมูลเก็บเฉพาะในเบราว์เซอร์นี้ ไม่ส่งขึ้นเซิร์ฟเวอร์
                {draft?.fileName ? ` — ${draft.fileName}` : ""}.
              </Dialog.Description>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={onOptOut}>
              ไม่แสดงอีก
            </Button>
            <Button variant="secondary" size="sm" onClick={onDiscard}>
              ทิ้ง
            </Button>
            <Button size="sm" onClick={onRestore}>
              กู้คืน (Restore)
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
