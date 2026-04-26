export type CleanerKey =
  | "removeInlineStyles"
  | "removeEmptyTags"
  | "collapseSpaces"
  | "removeAttributes"
  | "removeClassesAndIds"
  | "removeComments"
  | "plainText"
  | "unwrapSpans";

export interface CleanerInfo {
  key: CleanerKey;
  label: string;
  description: string;
}

export const CLEANERS: readonly CleanerInfo[] = [
  {
    key: "removeInlineStyles",
    label: "สไตล์ inline",
    description: "ลบ attribute style=\"…\" ออกจากทุก element",
  },
  {
    key: "removeEmptyTags",
    label: "แท็กว่าง",
    description: "ลบแท็กที่ไม่มีข้อความหรือ children ที่มีความหมาย",
  },
  {
    key: "collapseSpaces",
    label: "ช่องว่าง",
    description: "รวมช่องว่างซ้ำและตัดขอบบรรทัด",
  },
  {
    key: "removeAttributes",
    label: "Attributes",
    description: "ลบ attribute ของแท็ก (คงไว้: href, src, alt)",
  },
  {
    key: "removeClassesAndIds",
    label: "Class & ID",
    description: "ลบ attribute class และ id",
  },
  {
    key: "removeComments",
    label: "คอมเมนต์",
    description: "ลบ HTML comment (<!-- … -->)",
  },
  {
    key: "unwrapSpans",
    label: "แท็ก Span",
    description: "ลบแท็ก <span> แต่คงเนื้อหาข้างในไว้",
  },
  {
    key: "plainText",
    label: "ข้อความล้วน",
    description: "ลบแท็กทั้งหมด คืนเฉพาะข้อความ",
  },
] as const;

export type ImageMode = "inline" | "separate";

export type ExportFormat = "html" | "zip" | "docx";

export interface DocumentSnapshot {
  id: string;
  fileName: string | null;
  savedAt: string;
  html: string;
  wordCount: number;
}
