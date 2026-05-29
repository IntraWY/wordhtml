import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorStore } from "./editorStore";

vi.mock("@/store/toastStore", () => ({
  useToastStore: { getState: () => ({ show: vi.fn() }) },
}));

vi.mock("@/store/uiStore", () => ({
  useUiStore: { getState: () => ({ setLastAction: vi.fn() }) },
}));

describe("editorStore.removeVariable", () => {
  beforeEach(() => {
    useEditorStore.setState({
      documentHtml:
        '<p><span class="variable-badge" data-variable="remove_me">{{remove_me}}</span> tail {{remove_me}} <span class="variable-badge" data-variable="keep">{{keep}}</span></p>',
      variables: [
        { name: "remove_me", value: "v1", isList: false },
        { name: "keep", value: "v2", isList: false },
      ],
      fieldValues: { remove_me: "v1", keep: "v2" },
      dataSet: {
        headers: ["remove_me", "keep"],
        rows: [{ remove_me: "a", keep: "b" }],
        currentRowIndex: 0,
      },
      htmlSyncRevision: 3,
      lastEditAt: 0,
    });
  });

  it("removes badge and plain tokens from documentHtml", () => {
    useEditorStore.getState().removeVariable("remove_me");
    const html = useEditorStore.getState().documentHtml;
    expect(html).not.toContain("{{remove_me}}");
    expect(html).not.toContain('data-variable="remove_me"');
    expect(html).toContain('data-variable="keep"');
  });

  it("removes variable from panel list and fieldValues", () => {
    useEditorStore.getState().removeVariable("remove_me");
    const state = useEditorStore.getState();
    expect(state.variables.map((v) => v.name)).toEqual(["keep"]);
    expect(state.fieldValues).toEqual({ keep: "v2" });
  });

  it("removes column from dataSet headers and rows", () => {
    useEditorStore.getState().removeVariable("remove_me");
    const { dataSet } = useEditorStore.getState();
    expect(dataSet?.headers).toEqual(["keep"]);
    expect(dataSet?.rows[0]).toEqual({ keep: "b" });
    expect(dataSet?.rows[0]).not.toHaveProperty("remove_me");
  });

  it("bumps htmlSyncRevision and lastEditAt", () => {
    const before = useEditorStore.getState().lastEditAt;
    useEditorStore.getState().removeVariable("remove_me");
    const state = useEditorStore.getState();
    expect(state.htmlSyncRevision).toBe(4);
    expect(state.lastEditAt).toBeGreaterThanOrEqual(before);
  });
});
