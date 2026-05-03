import { createJSONStorage, type PersistStorage } from "zustand/middleware";
import { useToastStore } from "@/store/toastStore";

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
  const version = (data["version"] as number) ?? 0;
  if (version >= SCHEMA_VERSION) return data;

  // Future migrations go here

  data["version"] = SCHEMA_VERSION;
  return data;
}

function migrateTemplateData(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return parsed;
  const data = parsed as Record<string, unknown>;
  const version = (data["version"] as number) ?? 0;
  if (version >= SCHEMA_VERSION) return data;

  // Future migrations go here

  data["version"] = SCHEMA_VERSION;
  return data;
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
        const result = await base.getItem(name);
        if (!result) return null;
        if (migrate) {
          const migrated = migrate(result) as StorageValue<S>;
          return migrated;
        }
        return result;
      } catch (e) {
        console.error(`[storage] Failed to read "${name}":`, e);
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
      } catch (e) {
        if (isQuotaError(e)) {
          console.error(`[storage] Quota exceeded for "${name}"`);
          useToastStore
            .getState()
            .show("พื้นที่จัดเก็บเต็ม กรุณาลบ Snapshot หรือ Template เก่า");
        } else {
          console.error(`[storage] Failed to write "${name}":`, e);
        }
      }
    },
    removeItem: async (name) => {
      try {
        await base.removeItem(name);
      } catch (e) {
        console.error(`[storage] Failed to remove "${name}":`, e);
      }
    },
  };
}

export function clearAllAppData(): void {
  try {
    localStorage.removeItem("wordhtml-editor");
    localStorage.removeItem("wordhtml-templates");
    useToastStore.getState().show("ลบข้อมูลทั้งหมดแล้ว");
  } catch (e) {
    console.error("[storage] Failed to clear app data:", e);
    useToastStore.getState().show("ไม่สามารถลบข้อมูลได้");
  }
}

export const editorStorage = createSafeStorage<{
  enabledCleaners: string[];
  imageMode: string;
  history: unknown[];
  pageSetup: unknown;
  templateMode: boolean;
  variables: unknown[];
  dataSet: unknown | null;
  autoCompressImages: boolean;
}>(migrateEditorData);

export const templateStorage = createSafeStorage<{
  templates: unknown[];
}>(migrateTemplateData);
