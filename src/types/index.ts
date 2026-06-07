export type CleanerKey =
  | "removeInlineStyles"
  | "removeEmptyTags"
  | "collapseSpaces"
  | "removeAttributes"
  | "removeClassesAndIds"
  | "removeComments"
  | "plainText"
  | "unwrapDeprecatedTags"
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
    key: "unwrapDeprecatedTags",
    label: "แท็กล้าสมัย",
    description: "ลบแท็กเก่าเช่น <font>, <center>, <big>, <tt>, <strike>",
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

export type ExportFormat = "html" | "zip" | "docx" | "md" | "pdf";

export interface HeaderFooterConfig {
  enabled: boolean;
  headerHtml: string;
  footerHtml: string;
  differentFirstPage: boolean;
  differentOddEven: boolean;
  firstPageHeaderHtml?: string;
  firstPageFooterHtml?: string;
  evenHeaderHtml?: string;
  evenFooterHtml?: string;
}

export interface Watermark {
  /** Watermark text, e.g. "ร่าง", "สำเนา", "ลับ". Empty/absent = no watermark. */
  text: string;
  /** 0–1, default 0.12 */
  opacity?: number;
  /** px, default 90 (editor) */
  fontSize?: number;
  /** CSS color, default "#1f2937" */
  color?: string;
  /** rotation in degrees, default -45 */
  angle?: number;
}

export interface PageSetup {
  size: "A4" | "Letter";
  orientation: "portrait" | "landscape";
  marginMm: { top: number; right: number; bottom: number; left: number };
  headerFooter?: HeaderFooterConfig;
  watermark?: Watermark;
  /** A2: when set, page 1 uses these margins (e.g. extra top for letterhead). */
  firstPageMarginMm?: { top: number; right: number; bottom: number; left: number };
}

// Template Studio types
export type {
  VariableType,
  TemplateVariable,
  DataSet,
  TemplateModeState,
  RepeatingRowConfig,
  GASExportOptions,
  ProcessedTemplate,
  GeneratedGAS,
  ParsedCSV,
} from "./template";

export interface DocumentSnapshot {
  id: string;
  fileName: string | null;
  savedAt: string;
  html: string;
  wordCount: number;
}

/** Auto-save snapshot preferences (persisted in editor store). */
export interface AutoSaveSettings {
  enabled: boolean;
  /** Idle delay before creating a snapshot after the last edit. */
  idleMs: number;
  /** Show toast + status bar message when an auto-save snapshot is created. */
  notifyOnSave: boolean;
}

export const AUTO_SAVE_IDLE_OPTIONS = [
  { value: 30_000, label: "30 วินาที (30s)" },
  { value: 60_000, label: "1 นาที (1m)" },
  { value: 120_000, label: "2 นาที (2m)" },
  { value: 300_000, label: "5 นาที (5m)" },
  { value: 600_000, label: "10 นาที (10m)" },
] as const;

export const DEFAULT_AUTO_SAVE: AutoSaveSettings = {
  enabled: true,
  idleMs: 120_000,
  notifyOnSave: false,
};
