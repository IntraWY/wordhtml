import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import type { DocumentSnapshot } from "@/types";

vi.mock("@/lib/firebaseConfig", () => ({
  isFirebaseConfigured: () => true,
}));

import {
  useAutosaveCloud,
  CLOUD_AUTOSAVE_IDLE_MS,
} from "./useAutosaveCloud";
import { useEditorStore } from "@/store/editorStore";
import { useAuthStore } from "@/store/authStore";

function snap(
  id: string,
  html: string,
  extra: Partial<DocumentSnapshot> = {}
): DocumentSnapshot {
  return {
    id,
    fileName: null,
    savedAt: "2026-01-01T00:00:00.000Z",
    html,
    wordCount: 1,
    ...extra,
  };
}

describe("useAutosaveCloud", () => {
  let saveSnapshot: ReturnType<
    typeof useEditorStore.getState
  >["saveSnapshot"] &
    ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    vi.spyOn(useEditorStore.persist, "hasHydrated").mockReturnValue(true);

    saveSnapshot = vi.fn() as typeof saveSnapshot;
    useEditorStore.setState({
      documentHtml: "",
      history: [],
      activeSnapshotId: null,
      htmlSyncRevision: 0,
      // override with a spy so we don't actually mutate history / touch cloud
      saveSnapshot,
      getDocumentHtml: () => useEditorStore.getState().documentHtml,
    });

    useAuthStore.setState({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { uid: "u1" } as any,
      authReady: true,
      isOnline: true,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("debounces saveSnapshot when signed in, hydrated, and dirty", () => {
    useEditorStore.setState({ documentHtml: "<p>fresh edit</p>" });

    renderHook(() => useAutosaveCloud());

    expect(saveSnapshot).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(CLOUD_AUTOSAVE_IDLE_MS);
    });

    expect(saveSnapshot).toHaveBeenCalledTimes(1);
    expect(saveSnapshot).toHaveBeenCalledWith({ source: "auto" });
  });

  it("does NOT fire when signed out", () => {
    useAuthStore.setState({ user: null });
    useEditorStore.setState({ documentHtml: "<p>fresh edit</p>" });

    renderHook(() => useAutosaveCloud());
    act(() => {
      vi.advanceTimersByTime(CLOUD_AUTOSAVE_IDLE_MS * 2);
    });

    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  it("does NOT fire before persisted state has hydrated", () => {
    vi.spyOn(useEditorStore.persist, "hasHydrated").mockReturnValue(false);
    vi.spyOn(useEditorStore.persist, "onFinishHydration").mockReturnValue(
      () => {}
    );
    useEditorStore.setState({ documentHtml: "<p>fresh edit</p>" });

    renderHook(() => useAutosaveCloud());
    act(() => {
      vi.advanceTimersByTime(CLOUD_AUTOSAVE_IDLE_MS * 2);
    });

    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  it("does NOT fire when the document is empty (not dirty)", () => {
    useEditorStore.setState({ documentHtml: "   " });

    renderHook(() => useAutosaveCloud());
    act(() => {
      vi.advanceTimersByTime(CLOUD_AUTOSAVE_IDLE_MS * 2);
    });

    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  it("does NOT fire when HTML matches the active snapshot (no duplicate)", () => {
    useEditorStore.setState({
      documentHtml: "<p>same</p>",
      history: [snap("a", "<p>same</p>")],
      activeSnapshotId: "a",
    });

    renderHook(() => useAutosaveCloud());
    act(() => {
      vi.advanceTimersByTime(CLOUD_AUTOSAVE_IDLE_MS * 2);
    });

    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  it("does NOT fire when HTML matches the latest snapshot with no active one", () => {
    useEditorStore.setState({
      documentHtml: "<p>same</p>",
      history: [snap("a", "<p>same</p>")],
      activeSnapshotId: null,
    });

    renderHook(() => useAutosaveCloud());
    act(() => {
      vi.advanceTimersByTime(CLOUD_AUTOSAVE_IDLE_MS * 2);
    });

    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  it("does NOT fire when auto-save is disabled (even signed in + dirty)", () => {
    useEditorStore.setState({
      documentHtml: "<p>fresh edit</p>",
      autoSave: { ...useEditorStore.getState().autoSave, enabled: false },
    });

    renderHook(() => useAutosaveCloud());
    act(() => {
      vi.advanceTimersByTime(CLOUD_AUTOSAVE_IDLE_MS * 2);
    });

    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  it("DOES fire when auto-save is explicitly enabled", () => {
    useEditorStore.setState({
      documentHtml: "<p>fresh edit</p>",
      autoSave: { ...useEditorStore.getState().autoSave, enabled: true },
    });

    renderHook(() => useAutosaveCloud());
    act(() => {
      vi.advanceTimersByTime(CLOUD_AUTOSAVE_IDLE_MS);
    });

    expect(saveSnapshot).toHaveBeenCalledTimes(1);
    expect(saveSnapshot).toHaveBeenCalledWith({ source: "auto" });
  });

  it("does NOT fire if auto-save is turned off after the timer is armed", () => {
    useEditorStore.setState({
      documentHtml: "<p>fresh edit</p>",
      autoSave: { ...useEditorStore.getState().autoSave, enabled: true },
    });

    renderHook(() => useAutosaveCloud());

    act(() => {
      vi.advanceTimersByTime(CLOUD_AUTOSAVE_IDLE_MS - 1);
      // User toggles auto-save OFF in Settings before the timer fires.
      useEditorStore.setState({
        autoSave: { ...useEditorStore.getState().autoSave, enabled: false },
      });
      vi.advanceTimersByTime(1);
    });

    expect(saveSnapshot).not.toHaveBeenCalled();
  });

  it("re-checks dirtiness at fire time and skips if reverted", () => {
    useEditorStore.setState({
      documentHtml: "<p>edit</p>",
      history: [snap("a", "<p>base</p>")],
      activeSnapshotId: "a",
    });

    renderHook(() => useAutosaveCloud());

    // User reverts back to the saved content before the timer fires.
    act(() => {
      vi.advanceTimersByTime(CLOUD_AUTOSAVE_IDLE_MS - 1);
      useEditorStore.setState({ documentHtml: "<p>base</p>" });
      vi.advanceTimersByTime(1);
    });

    expect(saveSnapshot).not.toHaveBeenCalled();
  });
});
