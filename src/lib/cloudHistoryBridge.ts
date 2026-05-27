/**
 * Bridges editorStore (no auth dependency) to Firestore history sync.
 * useCloudHistorySync sets the active user id when signed in.
 */

let activeUid: string | null = null;

export function setCloudHistoryUid(uid: string | null): void {
  activeUid = uid;
}

export function getCloudHistoryUid(): string | null {
  return activeUid;
}
