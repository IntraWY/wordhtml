import type { DocumentSnapshot } from "@/types";

/** Merge local and remote snapshots by id; newer savedAt wins. Newest first, capped at max. */
export function mergeSnapshots(
  local: DocumentSnapshot[],
  remote: DocumentSnapshot[],
  max = 20
): DocumentSnapshot[] {
  const byId = new Map<string, DocumentSnapshot>();

  for (const snap of [...local, ...remote]) {
    const existing = byId.get(snap.id);
    if (!existing || Date.parse(snap.savedAt) > Date.parse(existing.savedAt)) {
      byId.set(snap.id, snap);
    }
  }

  return [...byId.values()]
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
    .slice(0, max);
}
