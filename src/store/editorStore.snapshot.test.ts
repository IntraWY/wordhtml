import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVE_SNAPSHOT_SESSION_KEY,
  restoreActiveSnapshotFromSession,
  useEditorStore,
} from "./editorStore";

vi.mock("@/store/toastStore", () => ({
  useToastStore: { getState: () => ({ show: vi.fn() }) },
}));

vi.mock("@/store/uiStore", () => ({
  useUiStore: { getState: () => ({ setLastAction: vi.fn() }) },
}));

vi.mock("@/lib/cloudHistoryBridge", () => ({
  getCloudHistoryUid: vi.fn(() => null),
  setPauseCloudHistoryMerge: vi.fn(),
}));

vi.mock("@/lib/historyFirestore", () => ({
  saveSnapshotToCloud: vi.fn(() => Promise.resolve()),
  deleteSnapshotFromCloud: vi.fn(() => Promise.resolve()),
  renameSnapshotInCloud: vi.fn(() => Promise.resolve()),
  clearSnapshotsInCloud: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/draftRecovery", () => ({
  clearRecoveryDraft: vi.fn(),
  scheduleRecoveryDraft: vi.fn(),
}));

describe("editorStore saveSnapshot in-place", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useEditorStore.setState({
      documentHtml: "",
      fileName: null,
      history: [],
      activeSnapshotId: null,
      htmlSyncRevision: 0,
    });
  });

  it("two saves after edits keep one history entry with same id", () => {
    useEditorStore.setState({ documentHtml: "<p>v1</p>" });
    useEditorStore.getState().saveSnapshot();

    const first = useEditorStore.getState();
    expect(first.history).toHaveLength(1);
    const firstId = first.history[0]!.id;
    expect(first.activeSnapshotId).toBe(firstId);

    useEditorStore.setState({ documentHtml: "<p>v2</p>" });
    useEditorStore.getState().saveSnapshot();

    const second = useEditorStore.getState();
    expect(second.history).toHaveLength(1);
    expect(second.history[0]!.id).toBe(firstId);
    expect(second.history[0]!.html).toBe("<p>v2</p>");
    expect(second.activeSnapshotId).toBe(firstId);
  });

  it("loadSnapshot + edit + save updates same entry without growing history", () => {
    const id = "snap-existing";
    useEditorStore.setState({
      history: [
        {
          id,
          fileName: "doc.html",
          savedAt: "2026-01-01T00:00:00.000Z",
          html: "<p>original</p>",
          wordCount: 1,
        },
        {
          id: "snap-other",
          fileName: "other.html",
          savedAt: "2026-01-02T00:00:00.000Z",
          html: "<p>other</p>",
          wordCount: 1,
        },
      ],
    });

    useEditorStore.getState().loadSnapshot(id);
    expect(useEditorStore.getState().activeSnapshotId).toBe(id);

    useEditorStore.setState({ documentHtml: "<p>edited</p>" });
    useEditorStore.getState().saveSnapshot();

    const state = useEditorStore.getState();
    expect(state.history).toHaveLength(2);
    expect(state.history[0]!.id).toBe(id);
    expect(state.history[0]!.html).toBe("<p>edited</p>");
    expect(state.activeSnapshotId).toBe(id);
  });

  it("restores activeSnapshotId from session after hydrate when id is in history", () => {
    const id = "snap-session";
    sessionStorage.setItem(ACTIVE_SNAPSHOT_SESSION_KEY, id);
    useEditorStore.setState({
      activeSnapshotId: null,
      history: [
        {
          id,
          fileName: "doc.html",
          savedAt: "2026-01-01T00:00:00.000Z",
          html: "<p>saved</p>",
          wordCount: 1,
        },
      ],
    });

    restoreActiveSnapshotFromSession();

    expect(useEditorStore.getState().activeSnapshotId).toBe(id);
    expect(sessionStorage.getItem(ACTIVE_SNAPSHOT_SESSION_KEY)).toBe(id);
  });
});

describe("editorStore newDocument", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useEditorStore.setState({
      documentHtml: "",
      fileName: null,
      history: [],
      activeSnapshotId: null,
      htmlSyncRevision: 0,
    });
  });

  it("saves current content to history, then clears the document", () => {
    useEditorStore.setState({ documentHtml: "<p>work in progress</p>" });

    useEditorStore.getState().newDocument();

    const state = useEditorStore.getState();
    // The unsaved work was captured into History before clearing.
    expect(state.history).toHaveLength(1);
    expect(state.history[0]!.html).toBe("<p>work in progress</p>");
    // The editor is now a blank new document.
    expect(state.documentHtml).toBe("");
    expect(state.activeSnapshotId).toBeNull();
  });

  it("on an empty document, clears without adding a history entry", () => {
    useEditorStore.getState().newDocument();

    const state = useEditorStore.getState();
    expect(state.history).toHaveLength(0);
    expect(state.documentHtml).toBe("");
  });

  it("auto-restores saved document into empty editor from persisted activeSnapshotId", () => {
    const id = "snap-persisted";
    // Simulate a fresh reload: editor empty, but pointer + history hydrated
    // from localStorage (activeSnapshotId now lives in partialize).
    useEditorStore.setState({
      documentHtml: "",
      activeSnapshotId: id,
      htmlSyncRevision: 0,
      history: [
        {
          id,
          fileName: "doc.html",
          savedAt: "2026-01-01T00:00:00.000Z",
          html: "<p>saved doc</p>",
          wordCount: 2,
        },
      ],
    });

    restoreActiveSnapshotFromSession();

    const state = useEditorStore.getState();
    expect(state.documentHtml).toBe("<p>saved doc</p>");
    expect(state.activeSnapshotId).toBe(id);
    expect(state.htmlSyncRevision).toBe(1);
    expect(sessionStorage.getItem(ACTIVE_SNAPSHOT_SESSION_KEY)).toBe(id);
  });

  it("clears pointer and leaves editor empty when activeSnapshotId is stale", () => {
    useEditorStore.setState({
      documentHtml: "",
      activeSnapshotId: "missing",
      history: [],
    });

    restoreActiveSnapshotFromSession();

    const state = useEditorStore.getState();
    expect(state.activeSnapshotId).toBeNull();
    expect(state.documentHtml).toBe("");
  });

  it("double saveSnapshot sync does not grow history length", () => {
    useEditorStore.setState({ documentHtml: "<p>v1</p>" });
    const store = useEditorStore.getState();
    store.saveSnapshot();
    store.saveSnapshot();

    expect(useEditorStore.getState().history).toHaveLength(1);

    useEditorStore.setState({ documentHtml: "<p>v2</p>" });
    store.saveSnapshot();
    store.saveSnapshot();

    const state = useEditorStore.getState();
    expect(state.history).toHaveLength(1);
    expect(state.history[0]!.html).toBe("<p>v2</p>");
  });

  it("reset then save creates a new entry", () => {
    useEditorStore.setState({ documentHtml: "<p>before reset</p>" });
    useEditorStore.getState().saveSnapshot();
    expect(useEditorStore.getState().history).toHaveLength(1);

    useEditorStore.getState().reset();
    expect(useEditorStore.getState().activeSnapshotId).toBeNull();

    useEditorStore.setState({ documentHtml: "<p>after reset</p>" });
    useEditorStore.getState().saveSnapshot();

    const state = useEditorStore.getState();
    expect(state.history).toHaveLength(2);
    expect(state.history[0]!.html).toBe("<p>after reset</p>");
    expect(state.activeSnapshotId).toBe(state.history[0]!.id);
  });
});
