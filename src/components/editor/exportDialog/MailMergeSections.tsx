"use client";

import { FileArchive } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface MailMergeSectionsProps {
  /** True when templateMode is on and there is at least one data row. */
  canMailMerge: boolean;
  rowCount: number;
  comboRecipientsRaw: string;
  setComboRecipientsRaw: (value: string) => void;
  comboRecipients: string[];
  comboFileCount: number;
  onMailMergeExport: () => void;
  onMailMergeDistributionExport: () => void;
}

/**
 * Mail-merge export blocks: plain per-row ZIP and the row × recipient
 * distribution combo (GAP 09). Behaviour-identical extraction from
 * `ExportDialog`. Parent owns the export handlers and combo state.
 */
export function MailMergeSections({
  canMailMerge,
  rowCount,
  comboRecipientsRaw,
  setComboRecipientsRaw,
  comboRecipients,
  comboFileCount,
  onMailMergeExport,
  onMailMergeDistributionExport,
}: MailMergeSectionsProps) {
  if (!canMailMerge) return null;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-3 py-2">
        <p className="text-xs text-[color:var(--color-muted-foreground)]">
          Mail-merge — สร้างเอกสารแยกฉบับจากข้อมูลทุกแถว ({rowCount} แถว)
          แล้วดาวน์โหลดเป็น ZIP
        </p>
        <Button variant="secondary" onClick={() => void onMailMergeExport()}>
          <FileArchive />
          ส่งออก mail-merge ({rowCount})
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-3 py-2">
        <p className="text-xs text-[color:var(--color-muted-foreground)]">
          ผสานข้อมูล × สำเนาเรียน (Mail-merge × Distribution) —
          ใส่รายชื่อผู้รับ (บรรทัดละชื่อ หรือคั่นด้วยจุลภาค)
          ระบบจะแทน <code className="font-mono">{"{{เรียน}}"}</code>{" "}
          ด้วยชื่อผู้รับ และสร้างเอกสารแยกฉบับต่อทุกคู่ แถวข้อมูล × ผู้รับ
        </p>
        <textarea
          rows={3}
          value={comboRecipientsRaw}
          onChange={(e) => setComboRecipientsRaw(e.target.value)}
          placeholder={"ผู้อำนวยการสำนัก ก\nผู้อำนวยการสำนัก ข\n…"}
          aria-label="รายชื่อผู้รับ (สำเนาเรียน)"
          className="resize-y rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[color:var(--color-foreground)]"
        />
        {comboRecipients.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-[color:var(--color-muted-foreground)]">
              จะได้ไฟล์ {rowCount} แถว × {comboRecipients.length} ผู้รับ ={" "}
              {comboFileCount} ไฟล์
            </span>
            <Button
              variant="secondary"
              onClick={() => void onMailMergeDistributionExport()}
            >
              <FileArchive />
              ส่งออก mail-merge × สำเนาเรียน ({comboFileCount})
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
