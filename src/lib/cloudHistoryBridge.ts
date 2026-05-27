/**
 * Bridges editorStore (no auth dependency) to Firestore history sync.
 * useCloudHistorySync sets the active user id when signed in.
 */

let activeUid: string | null = null;
let mergePaused = false;

export function setCloudHistoryUid(uid: string | null): void {
  activeUid = uid;
}

export function getCloudHistoryUid(): string | null {
  return activeUid;
}

/** Suppress onSnapshot merge while clearing cloud history (avoids race). */
export function setPauseCloudHistoryMerge(paused: boolean): void {
  mergePaused = paused;
}

export function isCloudHistoryMergePaused(): boolean {
  return mergePaused;
}

export function sessionUploadKey(uid: string): string {
  return `wordhtml-history-uploaded-${uid}`;
}

export function hasUploadedHistoryThisSession(uid: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(sessionUploadKey(uid)) === "1";
}

export function markHistoryUploadedThisSession(uid: string): void {
  try {
    sessionStorage.setItem(sessionUploadKey(uid), "1");
  } catch {
    /* ignore */
  }
}

export function clearHistoryUploadSession(uid: string): void {
  try {
    sessionStorage.removeItem(sessionUploadKey(uid));
  } catch {
    /* ignore */
  }
}
