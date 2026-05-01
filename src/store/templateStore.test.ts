import { beforeEach, describe, expect, it } from "vitest";
import { useTemplateStore } from "./templateStore";

const defaultPageSetup = {
  size: "A4" as const,
  orientation: "portrait" as const,
  marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
};

describe("templateStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useTemplateStore.setState({ templates: [], panelOpen: false });
  });

  it("saveTemplate adds a template with correct shape", () => {
    useTemplateStore.getState().saveTemplate("หนังสือราชการ", "<p>test</p>", defaultPageSetup);
    const { templates } = useTemplateStore.getState();
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe("หนังสือราชการ");
    expect(templates[0].html).toBe("<p>test</p>");
    expect(templates[0].pageSetup).toEqual(defaultPageSetup);
    expect(templates[0].id).toBeDefined();
    expect(templates[0].createdAt).toBeDefined();
  });

  it("saveTemplate prepends — newest template is first", () => {
    useTemplateStore.getState().saveTemplate("Template A", "<p>a</p>", defaultPageSetup);
    useTemplateStore.getState().saveTemplate("Template B", "<p>b</p>", defaultPageSetup);
    const { templates } = useTemplateStore.getState();
    expect(templates[0].name).toBe("Template B");
    expect(templates[1].name).toBe("Template A");
  });

  it("renameTemplate updates name, leaves other fields unchanged", () => {
    useTemplateStore.getState().saveTemplate("Old Name", "<p>x</p>", defaultPageSetup);
    const id = useTemplateStore.getState().templates[0].id;
    useTemplateStore.getState().renameTemplate(id, "New Name");
    const { templates } = useTemplateStore.getState();
    expect(templates[0].name).toBe("New Name");
    expect(templates[0].html).toBe("<p>x</p>");
  });

  it("deleteTemplate removes the matching template by id", () => {
    useTemplateStore.getState().saveTemplate("To Delete", "<p>d</p>", defaultPageSetup);
    const id = useTemplateStore.getState().templates[0].id;
    useTemplateStore.getState().deleteTemplate(id);
    expect(useTemplateStore.getState().templates).toHaveLength(0);
  });

  it("openPanel / closePanel toggle panelOpen", () => {
    expect(useTemplateStore.getState().panelOpen).toBe(false);
    useTemplateStore.getState().openPanel();
    expect(useTemplateStore.getState().panelOpen).toBe(true);
    useTemplateStore.getState().closePanel();
    expect(useTemplateStore.getState().panelOpen).toBe(false);
  });
});
