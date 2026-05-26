/** Debug-mode performance telemetry (session 30d885). Remove after verification. */
const ENDPOINT =
  "http://127.0.0.1:7483/ingest/d0764d96-9049-49c5-b3c7-41bf1f6afffd";
const SESSION_ID = "30d885";

const lastSent = new Map<string, number>();
const THROTTLE_MS = 2000;

export function debugPerfLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  runId = "pre-fix"
): void {
  if (process.env.NODE_ENV === "production") return;
  if (typeof window === "undefined") return;
  const key = `${hypothesisId}:${message}`;
  const now = Date.now();
  const prev = lastSent.get(key) ?? 0;
  if (now - prev < THROTTLE_MS) return;
  lastSent.set(key, now);

  // #region agent log
  fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: now,
    }),
  }).catch(() => {});
  // #endregion
}
