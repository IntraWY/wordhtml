"use client";

import { useEffect } from "react";

import { setCloudHistoryUid } from "@/lib/cloudHistoryBridge";
import { isFirebaseConfigured } from "@/lib/firebaseConfig";
import {
  subscribeSnapshots,
  uploadLocalSnapshotsToCloud,
} from "@/lib/historyFirestore";
import { mergeSnapshots } from "@/lib/mergeSnapshots";
import { useAuthStore } from "@/store/authStore";
import { useEditorStore } from "@/store/editorStore";

/** Subscribes to cloud snapshots when signed in; merges into local history. */
export function useCloudHistorySync(): void {
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const setCloudSyncStatus = useAuthStore((s) => s.setCloudSyncStatus);

  useEffect(() => {
    if (!isFirebaseConfigured() || !authReady) return;

    const uid = user?.uid ?? null;
    setCloudHistoryUid(uid);

    if (!uid) {
      setCloudSyncStatus("idle");
      return;
    }

    let cancelled = false;
    setCloudSyncStatus("syncing");

    const local = useEditorStore.getState().history;
    void uploadLocalSnapshotsToCloud(uid, local).catch((err) => {
      if (!cancelled) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setCloudSyncStatus("error", message);
      }
    });

    const unsub = subscribeSnapshots(
      uid,
      (remote) => {
        if (cancelled) return;
        const current = useEditorStore.getState().history;
        const merged = mergeSnapshots(current, remote);
        useEditorStore.setState({ history: merged });
        setCloudSyncStatus("idle");
      },
      (error) => {
        if (!cancelled) {
          setCloudSyncStatus("error", error.message);
        }
      }
    );

    return () => {
      cancelled = true;
      unsub();
      setCloudHistoryUid(null);
      setCloudSyncStatus("idle");
    };
  }, [user?.uid, authReady, setCloudSyncStatus]);
}
