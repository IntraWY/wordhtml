import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTemplateStore } from "./templateStore";

const defaultPageSetup = {
  size: "A4" as const,
  orientation: "portrait" as const,
  marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
};

vi.mock("@/lib/templateFirestore", () => ({
  subscribeTemplates: vi.fn(() => vi.fn()),
  saveTemplate: vi.fn(() => Promise.resolve()),
  updateTemplateName: vi.fn(() => Promise.resolve()),
  deleteTemplate: vi.fn(() => Promise.resolve()),
}));

describe("templateStore", () => {
  beforeEach(() => {
    useTemplateStore.setState({ templates: [], panelOpen: false, loading: false, error: null });
  });

  it("panelOpen toggles correctly", () => {
    expect(useTemplateStore.getState().panelOpen).toBe(false);
    useTemplateStore.getState().openPanel();
    expect(useTemplateStore.getState().panelOpen).toBe(true);
    useTemplateStore.getState().closePanel();
    expect(useTemplateStore.getState().panelOpen).toBe(false);
  });

  it("stores templates in state", () => {
    useTemplateStore.setState({
      templates: [
        {
          id: "1",
          name: "Test",
          html: "<p>test</p>",
          pageSetup: defaultPageSetup,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    expect(useTemplateStore.getState().templates).toHaveLength(1);
    expect(useTemplateStore.getState().templates[0].name).toBe("Test");
  });
});
