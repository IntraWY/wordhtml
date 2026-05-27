import { beforeEach, describe, expect, it, vi } from "vitest";

import { useEditorStore } from "./editorStore";

vi.mock("@/lib/cloudHistoryBridge", () => ({
  getCloudHistoryUid: vi.fn(() => "test-uid"),
  setPauseCloudHistoryMerge: vi.fn(),
}));

vi.mock("@/lib/historyFirestore", () => ({
  saveSnapshotToCloud: vi.fn(() => Promise.resolve()),
  deleteSnapshotFromCloud: vi.fn(() => Promise.resolve()),
  renameSnapshotInCloud: vi.fn(() => Promise.resolve()),
  clearSnapshotsInCloud: vi.fn(() => Promise.resolve()),
}));

const { clearSnapshotsInCloud } = await import("@/lib/historyFirestore");

describe("editorStore cloud history", () => {
  beforeEach(() => {
    vi.mocked(clearSnapshotsInCloud).mockResolvedValue(undefined);
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
  });

  it("clearHistory keeps local data when cloud clear fails", async () => {
    vi.mocked(clearSnapshotsInCloud).mockRejectedValueOnce(new Error("fail"));
    await useEditorStore.getState().clearHistory();
    expect(useEditorStore.getState().history).toHaveLength(1);
  });
});
