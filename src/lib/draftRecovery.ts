import type { PageSetup } from "@/types";
import { idbDeleteDraft, idbGetDraft, idbPutDraft } from "./indexedDb";

export const RECOVERY_DRAFT_KEY = "wordhtml-recovery-draft";
export const RECOVERY_OPT_OUT_KEY = "wordhtml-recovery-opt-out";
const SESSION_KEY = "wordhtml-recovery-session";
const DEBOUNCE_MS = 8000;
const LARGE_HTML_BYTES = 200_000;

export interface RecoveryDraft {
  html: string;
  fileName: string | null;
  savedAt: string;
  pageSetup?: PageSetup;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDraft: RecoveryDraft | null = null;

function serializePageSetup(ps?: PageSetup): string | undefined {
  if (!ps) return undefined;
  try {
    return JSON.stringify(ps);
  } catch {
    return undefined;
  }
}

function parsePageSetup(json?: string): PageSetup | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as PageSetup;
  } catch {
    return undefined;
  }
}

function writeSession(draft: RecoveryDraft): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
  } catch {
    /* quota — fall through to IDB */
  }
}

function readSession(): RecoveryDraft | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RecoveryDraft;
  } catch {
    return null;
  }
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function isRecoveryOptedOut(): boolean {
  try {
    return localStorage.getItem(RECOVERY_OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setRecoveryOptOut(optOut: boolean): void {
  try {
    if (optOut) {
      localStorage.setItem(RECOVERY_OPT_OUT_KEY, "1");
    } else {
      localStorage.removeItem(RECOVERY_OPT_OUT_KEY);
    }
  } catch {
    /* ignore */
  }
}

async function persistDraft(draft: RecoveryDraft): Promise<void> {
  const payload = {
    html: draft.html,
    fileName: draft.fileName,
    savedAt: draft.savedAt,
    pageSetupJson: serializePageSetup(draft.pageSetup),
  };

  if (draft.html.length >= LARGE_HTML_BYTES) {
    await idbPutDraft(RECOVERY_DRAFT_KEY, payload);
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          ...draft,
          html: "",
          _idb: true,
        } satisfies RecoveryDraft & { _idb?: boolean })
      );
    } catch {
      /* ignore */
    }
    return;
  }

  writeSession(draft);
  void idbDeleteDraft(RECOVERY_DRAFT_KEY).catch(() => {});
}

function flushPending(): void {
  if (!pendingDraft || isRecoveryOptedOut()) return;
  const draft = pendingDraft;
  pendingDraft = null;
  void persistDraft(draft).catch(() => {
    writeSession(draft);
  });
}

/** Debounced recovery write — separate from history snapshots. */
export function scheduleRecoveryDraft(
  html: string,
  fileName: string | null,
  pageSetup?: PageSetup
): void {
  if (isRecoveryOptedOut()) return;
  const trimmed = html.trim();
  if (!trimmed) {
    clearRecoveryDraft();
    return;
  }

  pendingDraft = {
    html,
    fileName,
    savedAt: new Date().toISOString(),
    pageSetup,
  };

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    flushPending();
  }, DEBOUNCE_MS);
}

export function flushRecoveryDraft(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  flushPending();
}

export async function loadRecoveryDraft(): Promise<RecoveryDraft | null> {
  if (isRecoveryOptedOut()) return null;

  const session = readSession();
  if (session && (session as RecoveryDraft & { _idb?: boolean })._idb) {
    try {
      const idb = await idbGetDraft(RECOVERY_DRAFT_KEY);
      if (!idb?.html) return null;
      return {
        html: idb.html,
        fileName: idb.fileName,
        savedAt: idb.savedAt,
        pageSetup: parsePageSetup(idb.pageSetupJson),
      };
    } catch {
      return null;
    }
  }

  if (session?.html?.trim()) return session;

  try {
    const idb = await idbGetDraft(RECOVERY_DRAFT_KEY);
    if (!idb?.html?.trim()) return null;
    return {
      html: idb.html,
      fileName: idb.fileName,
      savedAt: idb.savedAt,
      pageSetup: parsePageSetup(idb.pageSetupJson),
    };
  } catch {
    return null;
  }
}

export function clearRecoveryDraft(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingDraft = null;
  clearSession();
  void idbDeleteDraft(RECOVERY_DRAFT_KEY).catch(() => {});
}

/** True when recovery draft differs from empty doc and latest snapshot. */
export function shouldOfferRecovery(
  draft: RecoveryDraft | null,
  currentHtml: string,
  latestSnapshotHtml?: string
): boolean {
  if (!draft?.html?.trim()) return false;
  const cur = currentHtml.trim();
  const d = draft.html.trim();
  if (cur === d) return false;
  if (latestSnapshotHtml?.trim() === d) return false;
  return true;
}
