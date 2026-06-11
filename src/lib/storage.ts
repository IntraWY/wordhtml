import { createJSONStorage, type PersistStorage } from "zustand/middleware";
import { useToastStore } from "@/store/toastStore";
import type { DocumentSnapshot, PageSetup } from "@/types";
import { idbPutDraft, idbGetDraft, idbDeleteDraft } from "@/lib/indexedDb";

const IDB_EDITOR_BACKUP_KEY = "wordhtml-editor-backup";

const SCHEMA_VERSION = 1;

type StorageValue<S> = { state: S; version?: number };

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof Error &&
    (e.name === "QuotaExceededError" ||
      e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e.message?.toLowerCase().includes("quota"))
  );
}

function migrateEditorData(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return parsed;
  const data = parsed as Record<string, unknown>;
  const version = (data.version as number) ?? 0;
  if (version >= SCHEMA_VERSION) return data;

  // Future migrations go here

  return { ...data, version: SCHEMA_VERSION };
}

function migrateTemplateData(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return parsed;
  const data = parsed as Record<string, unknown>;
  const version = (data.version as number) ?? 0;
  if (version >= SCHEMA_VERSION) return data;

  // Future migrations go here

  return { ...data, version: SCHEMA_VERSION };
}

function createSafeStorage<S>(
  migrate?: (parsed: unknown) => unknown
): PersistStorage<S> {
  let storage: Storage | null = null;
  try {
    const testKey = "__wordhtml_storage_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    storage = localStorage;
  } catch {
    // localStorage unavailable (private mode, disabled, etc.)
  }

  const base = createJSONStorage<S>(() => {
    if (storage) return storage;
    const memory = new Map<string, string>();
    return {
      getItem: (name) => memory.get(name) ?? null,
      setItem: (name, value) => memory.set(name, value),
      removeItem: (name) => memory.delete(name),
    };
  });

  if (!base) {
    return {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    };
  }

  return {
    getItem: async (name) => {
      try {
        let result = await base.getItem(name);
        if (!result && name === "wordhtml-editor") {
          try {
            const backup = await idbGetDraft(IDB_EDITOR_BACKUP_KEY);
            if (backup?.html) {
              try {
                result = JSON.parse(backup.html) as StorageValue<S>;
                useToastStore
                  .getState()
                  .show("โหลดการตั้งค่าจาก IndexedDB สำรอง", "success");
              } catch {
                /* ignore corrupt backup */
              }
            }
          } catch {
            /* IndexedDB unavailable (SSR/tests) — keep localStorage result */
          }
        }
        if (!result) return null;
        if (migrate) {
          const migrated = migrate(result) as StorageValue<S>;
          return migrated;
        }
        return result;
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to parse persisted editor state, resetting:", err);
        }
        try {
          localStorage.removeItem(name);
        } catch {
          /* ignore */
        }
        useToastStore
          .getState()
          .show("ข้อมูลที่บันทึกไว้เสียหาย ระบบจะรีเซ็ตเป็นค่าเริ่มต้น");
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        await base.setItem(name, value);
        if (name === "wordhtml-editor") {
          void idbDeleteDraft(IDB_EDITOR_BACKUP_KEY).catch(() => {});
        }
      } catch (e) {
        if (isQuotaError(e)) {
          if (name === "wordhtml-editor" && value?.state) {
            try {
              const serialized = JSON.stringify(value);
              await idbPutDraft(IDB_EDITOR_BACKUP_KEY, {
                html: serialized,
                fileName: "editor-state-backup",
                savedAt: new Date().toISOString(),
              });
              useToastStore
                .getState()
                .show(
                  "localStorage เต็ม — สำรองการตั้งค่าไป IndexedDB แล้ว",
                  "warning"
                );
              return;
            } catch {
              /* fall through */
            }
          }
          useToastStore
            .getState()
            .show("พื้นที่จัดเก็บเต็ม กรุณาลบ Snapshot หรือ Template เก่า");
        }
      }
    },
    removeItem: async (name) => {
      try {
        await base.removeItem(name);
      } catch {
        // ignore
      }
    },
  };
}

export function clearAllAppData(): void {
  try {
    localStorage.removeItem("wordhtml-editor");
    localStorage.removeItem("wordhtml-templates");
    useToastStore.getState().show("ลบข้อมูลทั้งหมดแล้ว");
  } catch {
    useToastStore.getState().show("ไม่สามารถลบข้อมูลได้");
  }
}

export const editorStorage = createSafeStorage<{
  _v?: number;
  enabledCleaners: string[];
  imageMode: string;
  history: DocumentSnapshot[];
  activeSnapshotId?: string | null;
  pageSetup: PageSetup;
  templateMode: boolean;
  variables: unknown[];
  dataSet?: unknown;
  autoCompressImages: boolean;
  spellcheckEnabled?: boolean;
  exportMissingPolicy?: string;
}>(migrateEditorData);

export const templateStorage = createSafeStorage<{
  templates: unknown[];
}>(migrateTemplateData);
