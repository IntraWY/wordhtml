import type { DocumentSnapshot } from "@/types";

export interface SnapshotConflict {
  id: string;
  fileName: string | null;
  /** Which copy won the last-write-wins resolution. */
  winner: "local" | "remote";
  lostSavedAt: string;
  wonSavedAt: string;
}

export interface MergeSnapshotsResult {
  merged: DocumentSnapshot[];
  conflicts: SnapshotConflict[];
}

/**
 * Conflict policy (M1 / D2): **last-write-wins** by `savedAt` ISO timestamp.
 * We never merge HTML from two devices — the newer snapshot replaces the older one.
 * When local and remote share an id but differ in content/timestamp, the loser is
 * discarded (not duplicated). The UI shows a banner listing resolved conflicts.
 */
export function mergeSnapshotsWithConflicts(
  local: DocumentSnapshot[],
  remote: DocumentSnapshot[],
  max = 20
): MergeSnapshotsResult {
  const byId = new Map<string, DocumentSnapshot>();
  const localById = new Map(local.map((s) => [s.id, s]));
  const remoteById = new Map(remote.map((s) => [s.id, s]));
  const conflicts: SnapshotConflict[] = [];

  const allIds = new Set([...localById.keys(), ...remoteById.keys()]);

  for (const id of allIds) {
    const localSnap = localById.get(id);
    const remoteSnap = remoteById.get(id);

    if (localSnap && remoteSnap) {
      const localTs = Date.parse(localSnap.savedAt);
      const remoteTs = Date.parse(remoteSnap.savedAt);
      const sameContent =
        localSnap.html === remoteSnap.html &&
        localSnap.fileName === remoteSnap.fileName;

      if (!sameContent && localTs !== remoteTs) {
        const winner = localTs >= remoteTs ? localSnap : remoteSnap;
        const loser = localTs >= remoteTs ? remoteSnap : localSnap;
        conflicts.push({
          id,
          fileName: winner.fileName,
          winner: localTs >= remoteTs ? "local" : "remote",
          lostSavedAt: loser.savedAt,
          wonSavedAt: winner.savedAt,
        });
        byId.set(id, winner);
      } else if (!sameContent && localTs === remoteTs) {
        // Same timestamp but different payload — prefer remote (cloud source of truth).
        conflicts.push({
          id,
          fileName: remoteSnap.fileName,
          winner: "remote",
          lostSavedAt: localSnap.savedAt,
          wonSavedAt: remoteSnap.savedAt,
        });
        byId.set(id, remoteSnap);
      } else {
        byId.set(id, localTs >= remoteTs ? localSnap : remoteSnap);
      }
    } else {
      byId.set(id, (localSnap ?? remoteSnap)!);
    }
  }

  const merged = [...byId.values()]
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
    .slice(0, max);

  return { merged, conflicts };
}

/** Merge local and remote snapshots by id; newer savedAt wins. Newest first, capped at max. */
export function mergeSnapshots(
  local: DocumentSnapshot[],
  remote: DocumentSnapshot[],
  max = 20
): DocumentSnapshot[] {
  return mergeSnapshotsWithConflicts(local, remote, max).merged;
}

/** Local snapshots that should be pushed to cloud (missing remotely or locally newer). */
export function snapshotsToUpload(
  local: DocumentSnapshot[],
  remote: DocumentSnapshot[]
): DocumentSnapshot[] {
  const remoteById = new Map(remote.map((s) => [s.id, s]));
  return local.filter((s) => {
    const r = remoteById.get(s.id);
    return !r || Date.parse(s.savedAt) > Date.parse(r.savedAt);
  });
}
