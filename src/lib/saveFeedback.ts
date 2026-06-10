/**
 * Cloud-aware feedback text for the บันทึก (Save) action.
 *
 * The save button always writes to local history; when the user is signed in
 * (Firebase configured + auth), `saveSnapshot` additionally pushes the snapshot
 * to `users/{uid}/snapshots`. This helper picks the toast/last-action label so
 * the cloud behavior is explicit:
 *  - signed in            → "saved • synced to cloud"
 *  - configured, signed out → "saved locally — sign in to sync"
 *  - Firebase not configured → plain "saved"
 */
export interface SaveFeedbackContext {
  signedIn: boolean;
  firebaseConfigured: boolean;
}

export function saveFeedbackLabel(
  source: "manual" | "auto",
  ctx: SaveFeedbackContext
): string {
  if (source === "auto") return "บันทึกอัตโนมัติแล้ว";
  if (ctx.signedIn) return "บันทึกแล้ว • ซิงก์ขึ้นคลาวด์";
  if (ctx.firebaseConfigured) {
    return "บันทึกในเครื่องแล้ว — ลงชื่อเข้าใช้เพื่อซิงก์คลาวด์";
  }
  return "บันทึกแล้ว";
}
