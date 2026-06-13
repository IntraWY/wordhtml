import {
  countMissingFields,
  extractMergeFieldNames,
  getMergeFieldStatuses,
  stripControlBlocksForHealth,
  validateMergeFilters,
} from "@/lib/placeholders";
import type { TemplateVariable } from "@/types";

export type ExportHealthSeverity = "info" | "warning" | "error";

export interface ExportHealthIssue {
  severity: ExportHealthSeverity;
  code: string;
  message: string;
}

const LARGE_INLINE_IMAGE_BYTES = 500_000;

function estimateDataUrlBytes(src: string): number {
  const comma = src.indexOf(",");
  if (comma < 0) return src.length;
  const payload = src.slice(comma + 1);
  return Math.floor((payload.length * 3) / 4);
}

export interface ExportHealthInput {
  documentHtml: string;
  variables: TemplateVariable[];
  dataRow: Record<string, string>;
  templateMode: boolean;
  previewMode: "edit" | "preview";
}

export interface ExportHealthOptions {
  /** Strict mode: escalate "unset variable" info findings to severity "error". */
  strict?: boolean;
}

/**
 * Client-side checks before export (missing merge fields, filter type
 * mismatches, heavy inline images, empty doc).
 */
export function checkExportHealth(
  input: ExportHealthInput,
  options?: ExportHealthOptions
): ExportHealthIssue[] {
  const { documentHtml, variables, dataRow, templateMode, previewMode } = input;
  const strict = options?.strict ?? false;
  const issues: ExportHealthIssue[] = [];
  const trimmed = documentHtml.trim();

  if (!trimmed) {
    issues.push({
      severity: "error",
      code: "empty-document",
      message: "เอกสารว่าง — ไม่มีเนื้อหาให้ส่งออก",
    });
    return issues;
  }

  // For merge-field checks, strip conditional/loop control blocks first so that
  // variables hidden inside a FALSE branch (or loop-local {{this}} tokens) are
  // not counted as unset/missing. TRUE-branch vars survive and stay checked.
  const mergeFieldHtml = templateMode
    ? stripControlBlocksForHealth(documentHtml, variables, dataRow)
    : documentHtml;

  if (templateMode && previewMode === "preview") {
    const statuses = getMergeFieldStatuses(mergeFieldHtml, variables, dataRow, "preview");
    const missing = countMissingFields(statuses);
    if (missing > 0) {
      issues.push({
        severity: "warning",
        code: "missing-merge-fields",
        message: `มีตัวแปรที่ยังไม่มีค่า ${missing} รายการ — ตรวจแท็บคำเตือนในแผง Placeholder`,
      });
    }
  } else if (templateMode) {
    const names = extractMergeFieldNames(mergeFieldHtml);
    const unset = names.filter((n) => {
      const v = variables.find((x) => x.name === n);
      if (!v) return true;
      if (v.isList) return !v.listValues?.length;
      return !v.value?.trim();
    });
    if (unset.length > 0) {
      issues.push({
        severity: strict ? "error" : "info",
        code: "unset-variable-defaults",
        message: `ตัวแปร ${unset.length} รายการยังไม่มีค่าเริ่มต้นในแผงตัวแปร`,
      });
    }
  }

  if (templateMode) {
    const mismatches = validateMergeFilters(mergeFieldHtml, variables, dataRow);
    if (mismatches.length > 0) {
      const first = mismatches[0];
      issues.push({
        severity: "warning",
        code: "filter-type-mismatch",
        message: `ตัวกรองได้รับค่าที่ไม่ตรงชนิด ${mismatches.length} จุด (filter type mismatch) — เช่น {{${first.field}|${first.filter}}} ได้ค่า "${first.value}" — จะแสดงค่าดิบแทน`,
      });
    }
  }

  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  let largeImages = 0;
  while ((match = imgRegex.exec(documentHtml)) !== null) {
    const src = match[1];
    if (src.startsWith("data:") && estimateDataUrlBytes(src) > LARGE_INLINE_IMAGE_BYTES) {
      largeImages += 1;
    }
  }
  if (largeImages > 0) {
    issues.push({
      severity: "warning",
      code: "large-inline-images",
      message: `มีรูปฝังในหน้า ${largeImages} รูปที่มีขนาดใหญ่ — อาจทำให้ไฟล์ส่งออกช้า`,
    });
  }

  const tableCount = (documentHtml.match(/<table\b/gi) ?? []).length;
  const pageCount =
    typeof DOMParser !== "undefined"
      ? new DOMParser()
          .parseFromString(documentHtml, "text/html")
          .querySelectorAll(".page-node, [data-page-body]").length
      : (documentHtml.match(/\bpage-node\b/g) ?? []).length;
  if (tableCount > 0 && pageCount <= 1 && documentHtml.length > 12_000) {
    issues.push({
      severity: "info",
      code: "table-pagination",
      message:
        "เอกสารยาวที่มีตารางอาจไม่แบ่งหน้าอัตโนมัติในระดับแถว — ตรวจสอบตัวอย่างก่อนพิมพ์",
    });
  }

  return issues;
}
