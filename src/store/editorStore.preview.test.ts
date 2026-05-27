import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorStore } from "./editorStore";

vi.mock("@/store/toastStore", () => ({
  useToastStore: { getState: () => ({ show: vi.fn() }) },
}));

vi.mock("@/store/uiStore", () => ({
  useUiStore: { getState: () => ({ setLastAction: vi.fn() }) },
}));

describe("editorStore preview html sync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.setState({
      documentHtml: '<img width="50%" style="width:50%" src="x" />',
      previewMode: "edit",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("getDocumentHtml returns debounced pending width before flush", () => {
    useEditorStore.getState().setHtml('<img width="25%" style="width:25%" src="x" />', {
      debounce: true,
    });
    expect(useEditorStore.getState().documentHtml).toContain("50%");
    expect(useEditorStore.getState().getDocumentHtml()).toContain("25%");
  });

  it("flushDocumentHtml commits pending image width", () => {
    useEditorStore.getState().setHtml('<img width="25%" style="width:25%" src="x" />', {
      debounce: true,
    });
    useEditorStore.getState().flushDocumentHtml();
    expect(useEditorStore.getState().documentHtml).toContain("25%");
  });

  it("setPreviewMode preview flushes pending html", () => {
    useEditorStore.getState().setHtml('<img width="25%" style="width:25%" src="x" />', {
      debounce: true,
    });
    useEditorStore.getState().setPreviewMode("preview");
    expect(useEditorStore.getState().documentHtml).not.toContain("25%");
    expect(useEditorStore.getState().documentHtml).toMatch(/width="\d+"/);
    expect(useEditorStore.getState().previewMode).toBe("preview");
  });
});
