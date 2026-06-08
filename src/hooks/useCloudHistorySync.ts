"use client";

import { useEffect } from "react";

import {
  setCloudHistoryUid,
  isCloudHistoryMergePaused,
  hasUploadedHistoryThisSession,
  markHistoryUploadedThisSession,
  clearHistoryUploadSession,
} from "@/lib/cloudHistoryBridge";
import { isFirebaseConfigured } from "@/lib/firebaseConfig";
import {
  subscribeSnapshots,
  uploadLocalSnapshotsToCloud,
} from "@/lib/historyFirestore";
import {
  mergeSnapshotsWithConflicts,
  snapshotsToUpload,
} from "@/lib/mergeSnapshots";
import { useAuthStore } from "@/store/authStore";
import {
  setActiveSnapshotSession,
  useEditorStore,
} from "@/store/editorStore";

function resolveSyncStatus(
  isOnline: boolean,
  phase: "syncing" | "done" | "error"
): "syncing" | "synced" | "offline" | "error" {
  if (phase === "error") return "error";
  if (!isOnline) return "offline";
  if (phase === "syncing") return "syncing";
  return "synced";
}

/** Subscribes to cloud snapshots when signed in; merges into local history. */
export function useCloudHistorySync(): void {
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const isOnline = useAuthStore((s) => s.isOnline);
  const setCloudSyncStatus = useAuthStore((s) => s.setCloudSyncStatus);
  const setCloudConflicts = useAuthStore((s) => s.setCloudConflicts);

  useEffect(() => {
    if (!isFirebaseConfigured() || !authReady) return;

    const uid = user?.uid ?? null;
    setCloudHistoryUid(uid);

    if (!uid) {
      setCloudSyncStatus("idle");
      setCloudConflicts([]);
      return;
    }

    let cancelled = false;
    let unsub: (() => void) | null = null;
    setCloudSyncStatus(resolveSyncStatus(isOnline, "syncing"));

    const startSubscription = () => {
      if (cancelled) return;
      unsub = subscribeSnapshots(
        uid,
        (remote) => {
          if (cancelled || isCloudHistoryMergePaused()) return;

          const current = useEditorStore.getState().history;
          const { merged, conflicts } = mergeSnapshotsWithConflicts(current, remote);

          useEditorStore.setState((s) => {
            const activeStillExists =
              s.activeSnapshotId !== null &&
              merged.some((snap) => snap.id === s.activeSnapshotId);
            const activeSnapshotId = activeStillExists
              ? s.activeSnapshotId
              : null;
            if (!activeSnapshotId) setActiveSnapshotSession(null);
            return { history: merged, activeSnapshotId };
          });

          if (conflicts.length > 0) {
            setCloudConflicts(conflicts);
          }

          // Reconcile-upload on EVERY emission, not gated by the session flag.
          // The flag lives in sessionStorage and survives a hard refresh (its
          // cleanup may not run), so gating on it could strand a just-saved
          // local edit in the cloud. uploadLocalSnapshotsToCloud only pushes
          // the local-newer diff and no-ops otherwise, so this can't loop.
          const toUpload = snapshotsToUpload(current, remote);
          if (toUpload.length > 0) {
            void uploadLocalSnapshotsToCloud(uid, current, remote)
              .then(() => {
                if (!cancelled) markHistoryUploadedThisSession(uid);
              })
              .catch((err) => {
                if (!cancelled) {
                  const message = err instanceof Error ? err.message : "Upload failed";
                  setCloudSyncStatus("error", message);
                }
              });
          } else if (!hasUploadedHistoryThisSession(uid)) {
            markHistoryUploadedThisSession(uid);
          }

          if (!cancelled) {
            setCloudSyncStatus(resolveSyncStatus(isOnline, "done"));
          }
        },
        (error) => {
          if (!cancelled) {
            setCloudSyncStatus("error", error.message);
          }
        }
      );
    };

    // Gate the subscription until persisted history has hydrated. Otherwise the
    // first Firestore emission (often served from the SDK cache) can merge
    // against an empty local history and overwrite a freshly-saved snapshot.
    // Mirrors the hydration gate in useDraftRecovery.
    let offHydration: (() => void) | undefined;
    if (useEditorStore.persist.hasHydrated()) {
      startSubscription();
    } else {
      offHydration = useEditorStore.persist.onFinishHydration(startSubscription);
    }

    return () => {
      cancelled = true;
      offHydration?.();
      unsub?.();
      setCloudHistoryUid(null);
      setCloudSyncStatus("idle");
      setCloudConflicts([]);
      if (uid) clearHistoryUploadSession(uid);
    };
  }, [user?.uid, authReady, isOnline, setCloudSyncStatus, setCloudConflicts]);
}
