import type { PageSetup } from "@/types";
import type { TemplateVariable, DataSet } from "@/types/template";
import { APP_VERSION } from "@/lib/version";

/**
 * Project file ("save your work") — a round-trippable bundle of the full editor
 * state so a document can survive a reload and move between machines/devices
 * WITHOUT cloud sync. Distinct from content export (HTML/DOCX/…), which is
 * one-way, and from cloud Templates, which require sign-in.
 */
export const PROJECT_APP = "wordhtml";
export const PROJECT_KIND = "project";
export const PROJECT_VERSION = 1;

export interface ProjectDocument {
  html: string;
  fileName: string | null;
  pageSetup: PageSetup;
  templateMode: boolean;
  variables: TemplateVariable[];
  dataSet: DataSet | null;
}

interface ProjectFile {
  meta: {
    app: typeof PROJECT_APP;
    kind: typeof PROJECT_KIND;
    version: number;
    appVersion: string;
    exportedAt: string;
  };
  document: ProjectDocument;
}

function isPageSetup(v: unknown): v is PageSetup {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    (o.size === "A4" || o.size === "Letter") &&
    (o.orientation === "portrait" || o.orientation === "landscape") &&
    !!o.marginMm &&
    typeof o.marginMm === "object"
  );
}

/** Serialize the current editor document into a downloadable project Blob. */
export function buildProjectBlob(doc: ProjectDocument): Blob {
  const payload: ProjectFile = {
    meta: {
      app: PROJECT_APP,
      kind: PROJECT_KIND,
      version: PROJECT_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
    },
    document: {
      html: doc.html,
      fileName: doc.fileName,
      pageSetup: doc.pageSetup,
      templateMode: doc.templateMode,
      variables: doc.variables ?? [],
      dataSet: doc.dataSet ?? null,
    },
  };
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
}

/** Derive a project filename from the current document name. */
export function projectFileName(fileName: string | null): string {
  const base = (fileName ?? "wordhtml-document")
    .replace(/\.[^.]+$/, "") // drop any existing extension
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-") // strip filesystem-unsafe chars
    .slice(0, 80) || "wordhtml-document";
  return `${base}.wordhtml.json`;
}

/**
 * Parse a `.json` project file. Throws an Error with a Thai message when the
 * file is not a valid wordhtml project. Returns a normalized ProjectDocument.
 */
export function parseProjectFile(text: string): ProjectDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("ไฟล์ไม่ใช่รูปแบบ JSON ที่ถูกต้อง");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("ไฟล์โปรเจคไม่ถูกต้อง");
  }

  const data = parsed as Record<string, unknown>;
  const meta = data.meta as Record<string, unknown> | undefined;
  if (!meta || meta.app !== PROJECT_APP || meta.kind !== PROJECT_KIND) {
    throw new Error("ไฟล์นี้ไม่ใช่ไฟล์โปรเจคของ wordhtml");
  }

  const version = typeof meta.version === "number" ? meta.version : 0;
  if (version > PROJECT_VERSION) {
    throw new Error(
      "ไฟล์โปรเจคสร้างจาก wordhtml เวอร์ชันใหม่กว่า — กรุณาอัปเดตแอป"
    );
  }

  const doc = data.document as Record<string, unknown> | undefined;
  if (!doc || typeof doc.html !== "string") {
    throw new Error("ไฟล์โปรเจคไม่ถูกต้อง: ไม่พบเนื้อหาเอกสาร");
  }
  if (!isPageSetup(doc.pageSetup)) {
    throw new Error("ไฟล์โปรเจคไม่ถูกต้อง: การตั้งค่าหน้ากระดาษเสียหาย");
  }

  return {
    html: doc.html,
    fileName: typeof doc.fileName === "string" ? doc.fileName : null,
    pageSetup: doc.pageSetup,
    templateMode: doc.templateMode === true,
    variables: Array.isArray(doc.variables)
      ? (doc.variables as TemplateVariable[])
      : [],
    dataSet:
      doc.dataSet && typeof doc.dataSet === "object"
        ? (doc.dataSet as DataSet)
        : null,
  };
}

/** True when a filename looks like a wordhtml project file. */
export function isProjectFileName(name: string): boolean {
  return /\.wordhtml\.json$/i.test(name) || name.toLowerCase().endsWith(".json");
}
