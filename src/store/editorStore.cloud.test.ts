import { beforeEach, describe, expect, it, vi } from "vitest";

import { useEditorStore } from "./editorStore";

const setPauseCloudHistoryMerge = vi.fn();

vi.mock("@/lib/cloudHistoryBridge", () => ({
  getCloudHistoryUid: vi.fn(() => "test-uid"),
  setPauseCloudHistoryMerge: (...args: unknown[]) => setPauseCloudHistoryMerge(...args),
}));

vi.mock("@/lib/historyFirestore", () => ({
  saveSnapshotToCloud: vi.fn(() => Promise.resolve()),
  deleteSnapshotFromCloud: vi.fn(() => Promise.resolve()),
  renameSnapshotInCloud: vi.fn(() => Promise.resolve()),
  clearSnapshotsInCloud: vi.fn(() => Promise.resolve()),
}));

const { clearSnapshotsInCloud, deleteSnapshotFromCloud } = await import(
  "@/lib/historyFirestore"
);

describe("editorStore cloud history", () => {
  beforeEach(() => {
    vi.mocked(clearSnapshotsInCloud).mockResolvedValue(undefined);
    vi.mocked(deleteSnapshotFromCloud).mockResolvedValue(undefined);
    setPauseCloudHistoryMerge.mockClear();
    useEditorStore.setState({
      documentHtml: "",
      history: [
        {
          id: "snap-1",
          fileName: "doc",
          savedAt: new Date().toISOString(),
          html: "<p>hi</p>",
          wordCount: 1,
        },
      ],
    });
  });

  it("clearHistory awaits cloud clear before emptying local", async () => {
    await useEditorStore.getState().clearHistory();
    expect(clearSnapshotsInCloud).toHaveBeenCalledWith("test-uid");
    expect(useEditorStore.getState().history).toEqual([]);
    expect(setPauseCloudHistoryMerge).toHaveBeenCalledWith(true);
    expect(setPauseCloudHistoryMerge).toHaveBeenLastCalledWith(false);
  });

  it("clearHistory keeps local data when cloud clear fails", async () => {
    vi.mocked(clearSnapshotsInCloud).mockRejectedValueOnce(new Error("fail"));
    await useEditorStore.getState().clearHistory();
    expect(useEditorStore.getState().history).toHaveLength(1);
  });

  it("deleteSnapshot removes local after cloud delete and pauses merge", async () => {
    await useEditorStore.getState().deleteSnapshot("snap-1");
    expect(deleteSnapshotFromCloud).toHaveBeenCalledWith("test-uid", "snap-1");
    expect(useEditorStore.getState().history).toEqual([]);
    expect(setPauseCloudHistoryMerge).toHaveBeenCalledWith(true);
    expect(setPauseCloudHistoryMerge).toHaveBeenLastCalledWith(false);
  });

  it("deleteSnapshot keeps local when cloud delete fails", async () => {
    vi.mocked(deleteSnapshotFromCloud).mockRejectedValueOnce({
      code: "permission-denied",
    });
    await useEditorStore.getState().deleteSnapshot("snap-1");
    expect(useEditorStore.getState().history).toHaveLength(1);
  });
});
