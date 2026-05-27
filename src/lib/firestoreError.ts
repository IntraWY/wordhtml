/** User-facing message for Firestore / Firebase errors (delete, sync, etc.). */
export function firestoreErrorMessage(
  error: unknown,
  fallback: string
): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: string }).code)
      : null;

  switch (code) {
    case "permission-denied":
      return "ไม่มีสิทธิ์ — deploy Firestore rules (npm run firebase:deploy-rules) หรือเข้าสู่ระบบใหม่";
    case "unauthenticated":
      return "กรุณาเข้าสู่ระบบก่อนดำเนินการ";
    case "unavailable":
      return "การเชื่อมต่อ Firebase ไม่พร้อม กรุณาลองใหม่";
    default:
      if (error instanceof Error && error.message) {
        return `${fallback}: ${error.message}`;
      }
      return fallback;
  }
}
