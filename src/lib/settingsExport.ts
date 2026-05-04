import { useToastStore } from "@/store/toastStore";

const APP_NAME = "wordhtml";
const APP_VERSION = "0.1.0";
const EDITOR_KEY = "wordhtml-editor";
const TEMPLATES_KEY = "wordhtml-templates";

interface BackupData {
  meta: {
    app: string;
    version: string;
    exportDate: string;
  };
  editor: unknown;
  templates: unknown;
}

function readStorageItem(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStorageItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "ไม่สามารถเขียนข้อมูลได้";
    console.error(`[settingsExport] Failed to write ${key}:`, e);
    useToastStore.getState().show(`ไม่สามารถบันทึกข้อมูลได้: ${message}`, "error");
  }
}

export async function exportAllSettings(): Promise<Blob> {
  const editor = readStorageItem(EDITOR_KEY);
  const templates = readStorageItem(TEMPLATES_KEY);

  const payload: BackupData = {
    meta: {
      app: APP_NAME,
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
    },
    editor,
    templates,
  };

  const json = JSON.stringify(payload, null, 2);
  return new Blob([json], { type: "application/json;charset=utf-8" });
}

export async function importAllSettings(file: File): Promise<void> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("ไฟล์ไม่ใช่รูปแบบ JSON ที่ถูกต้อง");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("ไฟล์สำรองข้อมูลไม่ถูกต้อง");
  }

  const data = parsed as Record<string, unknown>;

  // Validate metadata
  const meta = data["meta"];
  if (!meta || typeof meta !== "object") {
    throw new Error("ไฟล์สำรองข้อมูลไม่ถูกต้อง: ไม่พบข้อมูล Meta");
  }

  const metaObj = meta as Record<string, unknown>;
  if (metaObj["app"] !== APP_NAME) {
    throw new Error("ไฟล์สำรองข้อมูลไม่ถูกต้อง: ไม่ใช่ข้อมูลจากแอป wordhtml");
  }

  // Validate expected keys exist
  if (!("editor" in data)) {
    throw new Error("ไฟล์สำรองข้อมูลไม่ถูกต้อง: ไม่พบข้อมูล Editor");
  }
  if (!("templates" in data)) {
    throw new Error("ไฟล์สำรองข้อมูลไม่ถูกต้อง: ไม่พบข้อมูล Templates");
  }

  // Write back to localStorage
  if (data["editor"] !== null) {
    writeStorageItem(EDITOR_KEY, data["editor"]);
  }
  if (data["templates"] !== null) {
    writeStorageItem(TEMPLATES_KEY, data["templates"]);
  }

  useToastStore.getState().show("กู้คืนข้อมูลสำเร็จ กรุณารีเฟรชหน้า");
}
