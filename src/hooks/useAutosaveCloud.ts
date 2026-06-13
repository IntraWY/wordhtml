"use client";

import { useEffect } from "react";

import { isFirebaseConfigured } from "@/lib/firebaseConfig";
import { useAuthStore } from "@/store/authStore";
import { useEditorStore } from "@/store/editorStore";

/**
 * Idle interval (ms) before a dirty document is autosaved to the cloud while
 * signed in. Shorter than the local 2-min auto-snapshot so a long editing
 * session isn't "one snapshot or nothing" — but long enough not to spam writes.
 */
export const CLOUD_AUTOSAVE_IDLE_MS = 25_000;

/**
 * Returns true when the live document has unsaved changes relative to the
 * snapshot that `saveSnapshot` would update. Mirrors the dirty check used by
 * `useBeforeUnload` / `scheduleAutoSnapshot`: non-empty HTML that differs from
 * the active snapshot (or the most recent one when nothing is active).
 *
 * Also respects the user's explicit auto-save preference: when auto-save is
 * turned off in Settings, this returns false so cloud autosave never fires —
 * exactly mirroring the local 2-min `scheduleAutoSnapshot`, which no-ops when
 * `autoSave.enabled` is false. Honoring the toggle keeps the privacy invariant:
 * a user who disabled auto-save must get no background Firestore writes.
 */
function isDirty(): boolean {
  const state = useEditorStore.getState();
  if (!state.autoSave.enabled) return false;
  const html = state.getDocumentHtml();
  if (!html.trim()) return false;
  const baseline = state.activeSnapshotId
    ? state.history.find((s) => s.id === state.activeSnapshotId)
    : state.history[0];
  return !baseline || baseline.html !== html;
}

/**
 * Continuous cloud autosave for signed-in users.
 *
 * When signed in with Google AND the document is dirty, this debounces
 * {@link CLOUD_AUTOSAVE_IDLE_MS} of editing idle and then calls the EXISTING
 * `saveSnapshot({ source: "auto" })` flow. It never writes to Firestore
 * directly — going through `saveSnapshot` keeps every invariant centralized:
 *   - sets the per-device `locallyUpdatedAt` marker (LWW tie-break),
 *   - dedupes identical HTML (no redundant snapshot),
 *   - honors the ≤20 / 4MB history caps,
 *   - mirrors to the cloud via the existing `useCloudHistorySync` bridge.
 *
 * Everything is gated on persist hydration (mirrors `useDraftRecovery` /
 * `useCloudHistorySync`) so it can never fire against un-hydrated state and
 * overwrite a freshly-saved snapshot. Signed-out users are untouched — purely
 * local, exactly as today.
 *
 * Coexists with the store's 2-min `scheduleAutoSnapshot`: both ultimately call
 * `saveSnapshot`, which dedupes identical HTML, so overlapping timers can never
 * produce a duplicate snapshot.
 */
export function useAutosaveCloud(): void {
  const uid = useAuthStore((s) => s.user?.uid ?? null);
  const authReady = useAuthStore((s) => s.authReady);
  // Reset the idle timer whenever the live document changes.
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const htmlSyncRevision = useEditorStore((s) => s.htmlSyncRevision);

  useEffect(() => {
    if (!isFirebaseConfigured() || !authReady || !uid) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const arm = () => {
      if (cancelled) return;
      if (!useEditorStore.persist.hasHydrated()) return;
      if (!isDirty()) return;
      timer = setTimeout(() => {
        if (cancelled) return;
        // Re-check at fire time; the user may have undone their edits.
        if (!isDirty()) return;
        useEditorStore.getState().saveSnapshot({ source: "auto" });
      }, CLOUD_AUTOSAVE_IDLE_MS);
    };

    let offHydration: (() => void) | undefined;
    if (useEditorStore.persist.hasHydrated()) {
      arm();
    } else {
      offHydration = useEditorStore.persist.onFinishHydration(() => arm());
    }

    return () => {
      cancelled = true;
      offHydration?.();
      if (timer) clearTimeout(timer);
    };
    // documentHtml / htmlSyncRevision re-arm the debounce on every edit.
  }, [uid, authReady, documentHtml, htmlSyncRevision]);
}
