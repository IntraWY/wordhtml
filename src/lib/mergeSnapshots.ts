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

      // This device's most-recent local edit time for the snapshot (if any).
      // It guards against an in-place Save being lost to a stale remote copy
      // that shares the same `savedAt` (ms-precise round-trip ties) or that
      // appears newer due to clock skew between devices.
      const localEditTs = localSnap.locallyUpdatedAt
        ? Date.parse(localSnap.locallyUpdatedAt)
        : NaN;
      const localEditedAfterRemote =
        !Number.isNaN(localEditTs) && localEditTs >= remoteTs;

      if (sameContent) {
        byId.set(id, localTs >= remoteTs ? localSnap : remoteSnap);
      } else {
        // Different payload — pick a winner. Local wins when it is strictly
        // newer, OR when this device edited it at/after the remote's savedAt
        // (covers the equal-ts tie and the older-ts-but-locally-edited case).
        const localWins = localTs > remoteTs || localEditedAfterRemote;
        const winner = localWins ? localSnap : remoteSnap;
        const loser = localWins ? remoteSnap : localSnap;
        conflicts.push({
          id,
          fileName: winner.fileName,
          winner: localWins ? "local" : "remote",
          lostSavedAt: loser.savedAt,
          wonSavedAt: winner.savedAt,
        });
        byId.set(id, winner);
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

/**
 * Local snapshots that should be pushed to cloud: missing remotely, locally
 * newer by `savedAt`, or edited locally at/after the remote `savedAt` with
 * differing content (the equal-ts in-place-Save case). Mirrors the merge's
 * local-edit protection so a saved edit reliably reaches the cloud.
 */
export function snapshotsToUpload(
  local: DocumentSnapshot[],
  remote: DocumentSnapshot[]
): DocumentSnapshot[] {
  const remoteById = new Map(remote.map((s) => [s.id, s]));
  return local.filter((s) => {
    const r = remoteById.get(s.id);
    if (!r) return true;
    if (Date.parse(s.savedAt) > Date.parse(r.savedAt)) return true;
    const sameContent = s.html === r.html && s.fileName === r.fileName;
    if (sameContent) return false;
    const localEditTs = s.locallyUpdatedAt ? Date.parse(s.locallyUpdatedAt) : NaN;
    return !Number.isNaN(localEditTs) && localEditTs >= Date.parse(r.savedAt);
  });
}
