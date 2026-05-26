import type { MammothMessage } from "@/lib/conversion/docxToHtml";
import type { EmptyStateConfig } from "./types";

export interface EmptyStateInput {
  documentHtml: string;
  templateMode: boolean;
  previewMode: "edit" | "preview";
  hasDataSet: boolean;
  dataSetRowIndex?: number;
  lastLoadWarnings: MammothMessage[];
}

const DEFAULT_PLACEHOLDER =
  "พิมพ์ วางจาก Word หรืออัปโหลดไฟล์ .docx เพื่อเริ่มต้น…";

export function getEmptyStateConfig(input: EmptyStateInput): EmptyStateConfig {
  const { templateMode, previewMode, hasDataSet, dataSetRowIndex, lastLoadWarnings } =
    input;

  if (lastLoadWarnings.length > 0) {
    return {
      variant: "warnings",
      tiptapPlaceholder: "เอกสารโหลดแล้ว — ตรวจสอบคำเตือนด้านบน",
      srOnlyDescription: "เอกสารมีคำเตือนจากการโหลดไฟล์",
      showEmptyHint: false,
    };
  }

  if (templateMode && hasDataSet && previewMode === "edit") {
    const row = (dataSetRowIndex ?? 0) + 1;
    return {
      variant: "template-preview",
      tiptapPlaceholder: `กด Preview เพื่อดูแถวที่ ${row} (Row preview)`,
      srOnlyDescription: "โหมด Template — พร้อมดูตัวอย่างจากชุดข้อมูล",
      showEmptyHint: true,
      hintTitle: "ชุดข้อมูลพร้อมแล้ว",
      hintSubtitle: "สลับไปมุมมอง Preview เพื่อแทนค่าตัวแปร",
      actions: [{ id: "preview", label: "ดูตัวอย่าง (Preview)", action: "preview" }],
    };
  }

  if (templateMode) {
    return {
      variant: "template",
      tiptapPlaceholder: "พิมพ์ {{ชื่อตัวแปร}} หรือเปิดแผงตัวแปร…",
      srOnlyDescription: "โหมด Template — ใช้ตัวแปรแบบ {{name}}",
      showEmptyHint: true,
      hintTitle: "โหมด Template",
      hintSubtitle: "พิมพ์ {{ชื่อ}} ในเอกสาร หรือเพิ่มจากแผงตัวแปร",
      actions: [{ id: "vars", label: "แผงตัวแปร (Variables)", action: "variables" }],
    };
  }

  return {
    variant: "default",
    tiptapPlaceholder: DEFAULT_PLACEHOLDER,
    srOnlyDescription: DEFAULT_PLACEHOLDER,
    showEmptyHint: true,
    actions: [
      { id: "file", label: "เปิดไฟล์ (Ctrl+O)", action: "open-file" },
    ],
  };
}

export function isDocumentEmpty(documentHtml: string): boolean {
  const trimmed = documentHtml.trim();
  if (!trimmed) return true;
  if (/<img\b/i.test(trimmed) || /<video\b/i.test(trimmed)) return false;
  const text = trimmed
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text.length === 0;
}
