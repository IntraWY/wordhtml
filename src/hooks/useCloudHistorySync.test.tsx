import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import type { DocumentSnapshot } from "@/types";

vi.mock("@/lib/firebaseConfig", () => ({
  isFirebaseConfigured: () => true,
}));

const subscribeSnapshots = vi.fn();
const uploadLocalSnapshotsToCloud = vi.fn(() => Promise.resolve());

vi.mock("@/lib/historyFirestore", () => ({
  subscribeSnapshots: (...args: unknown[]) => subscribeSnapshots(...args),
  uploadLocalSnapshotsToCloud: (...args: unknown[]) =>
    uploadLocalSnapshotsToCloud(...args),
}));

import { useCloudHistorySync } from "./useCloudHistorySync";
import { useEditorStore } from "@/store/editorStore";
import { useAuthStore } from "@/store/authStore";
import { markHistoryUploadedThisSession } from "@/lib/cloudHistoryBridge";

function snap(
  id: string,
  savedAt: string,
  html: string,
  extra: Partial<DocumentSnapshot> = {}
): DocumentSnapshot {
  return { id, fileName: null, savedAt, html, wordCount: 1, ...extra };
}

describe("useCloudHistorySync", () => {
  beforeEach(() => {
    sessionStorage.clear();
    subscribeSnapshots.mockReset();
    subscribeSnapshots.mockReturnValue(() => {});
    uploadLocalSnapshotsToCloud.mockReset();
    uploadLocalSnapshotsToCloud.mockResolvedValue(undefined);
    useEditorStore.setState({ history: [], activeSnapshotId: null });
    useAuthStore.setState({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { uid: "u1" } as any,
      authReady: true,
      isOnline: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not subscribe until persisted history has hydrated", () => {
    let hydrationCb: (() => void) | null = null;
    vi.spyOn(useEditorStore.persist, "hasHydrated").mockReturnValue(false);
    vi.spyOn(useEditorStore.persist, "onFinishHydration").mockImplementation(
      (cb: () => void) => {
        hydrationCb = cb;
        return () => {};
      }
    );

    renderHook(() => useCloudHistorySync());
    expect(subscribeSnapshots).not.toHaveBeenCalled();

    act(() => {
      hydrationCb?.();
    });
    expect(subscribeSnapshots).toHaveBeenCalledTimes(1);
  });

  it("first merge runs against hydrated history and keeps the local edit", () => {
    vi.spyOn(useEditorStore.persist, "hasHydrated").mockReturnValue(true);

    const ts = "2026-01-02T00:00:00.000Z";
    useEditorStore.setState({
      history: [snap("a", ts, "<p>local edit</p>", { locallyUpdatedAt: ts })],
    });
    // Stale flag that survived a hard refresh — must NOT block reconcile upload.
    markHistoryUploadedThisSession("u1");

    let onNext: ((remote: DocumentSnapshot[]) => void) | null = null;
    subscribeSnapshots.mockImplementation(
      (_uid: string, next: (remote: DocumentSnapshot[]) => void) => {
        onNext = next;
        return () => {};
      }
    );

    renderHook(() => useCloudHistorySync());
    expect(subscribeSnapshots).toHaveBeenCalledTimes(1);

    act(() => {
      onNext?.([snap("a", ts, "<p>stale remote</p>")]);
    });

    expect(useEditorStore.getState().history[0]!.html).toBe("<p>local edit</p>");
    expect(uploadLocalSnapshotsToCloud).toHaveBeenCalledTimes(1);
  });
});
