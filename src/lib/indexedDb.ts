const DB_NAME = "wordhtml-idb";
const DB_VERSION = 1;
const DRAFT_STORE = "drafts";

export interface DraftRecord {
  html: string;
  fileName: string | null;
  savedAt: string;
  pageSetupJson?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: "id" });
      }
    };
  });
}

export async function idbPutDraft(
  id: string,
  record: DraftRecord
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
    tx.objectStore(DRAFT_STORE).put({ id, ...record });
  });
}

export async function idbGetDraft(id: string): Promise<DraftRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const req = tx.objectStore(DRAFT_STORE).get(id);
    req.onsuccess = () => {
      db.close();
      const row = req.result as (DraftRecord & { id: string }) | undefined;
      if (!row) {
        resolve(null);
        return;
      }
      const { id: _omit, ...rest } = row;
      void _omit;
      resolve(rest);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function idbDeleteDraft(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
    tx.objectStore(DRAFT_STORE).delete(id);
  });
}
