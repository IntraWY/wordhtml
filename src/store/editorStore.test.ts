import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorStore } from "./editorStore";

vi.mock("@/store/toastStore", () => ({
  useToastStore: { getState: () => ({ show: vi.fn() }) },
}));

vi.mock("@/store/uiStore", () => ({
  useUiStore: { getState: () => ({ setLastAction: vi.fn() }) },
}));

describe("editorStore htmlSyncRevision", () => {
  beforeEach(() => {
    useEditorStore.setState({
      documentHtml: "<p>current</p>",
      fileName: "test.html",
      history: [
        {
          id: "snap-1",
          fileName: "saved.html",
          savedAt: new Date().toISOString(),
          html: "<p>saved</p>",
          wordCount: 1,
        },
      ],
      htmlSyncRevision: 0,
    });
  });

  it("increments on loadSnapshot", () => {
    useEditorStore.getState().loadSnapshot("snap-1");
    const state = useEditorStore.getState();
    expect(state.htmlSyncRevision).toBe(1);
    expect(state.documentHtml).toBe("<p>saved</p>");
    expect(state.fileName).toBe("saved.html");
  });

  it("increments on reset", () => {
    useEditorStore.getState().reset();
    expect(useEditorStore.getState().htmlSyncRevision).toBe(1);
    expect(useEditorStore.getState().documentHtml).toBe("");
  });

  it("does not increment on duplicateSnapshot", () => {
    useEditorStore.getState().duplicateSnapshot("snap-1");
    expect(useEditorStore.getState().htmlSyncRevision).toBe(0);
  });
});
