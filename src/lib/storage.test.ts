import { beforeEach, describe, expect, it, vi } from "vitest";

// IndexedDB + toast are side-effect dependencies — stub them so the storage
// logic can be exercised in jsdom without a real IDB or UI.
vi.mock("@/lib/indexedDb", () => ({
  idbGetDraft: vi.fn(() => Promise.resolve(null)),
  idbPutDraft: vi.fn(() => Promise.resolve()),
  idbDeleteDraft: vi.fn(() => Promise.resolve()),
}));

const show = vi.fn();
vi.mock("@/store/toastStore", () => ({
  useToastStore: { getState: () => ({ show }) },
}));

import { editorStorage, clearAllAppData } from "./storage";

const EDITOR_KEY = "wordhtml-editor";

describe("createSafeStorage (editorStorage)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("returns null when nothing is stored", async () => {
    expect(await editorStorage.getItem(EDITOR_KEY)).toBeNull();
  });

  it("round-trips a value and stamps the current schema version on read", async () => {
    await editorStorage.setItem(EDITOR_KEY, {
      state: {
        enabledCleaners: ["removeComments"],
        imageMode: "inline",
        history: [],
        pageSetup: {
          size: "A4",
          orientation: "portrait",
          marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
        },
        templateMode: false,
        variables: [],
        autoCompressImages: true,
      },
      version: 0,
    });

    const got = (await editorStorage.getItem(EDITOR_KEY)) as {
      state: { enabledCleaners: string[] };
      version: number;
    };
    expect(got).not.toBeNull();
    expect(got.state.enabledCleaners).toEqual(["removeComments"]);
    expect(got.version).toBe(1); // migrateEditorData bumps to SCHEMA_VERSION
  });

  it("recovers from corrupt JSON by resetting and warning the user", async () => {
    localStorage.setItem(EDITOR_KEY, "{ this is not valid json");
    const got = await editorStorage.getItem(EDITOR_KEY);
    expect(got).toBeNull();
    // corrupt entry is purged so the app starts clean
    expect(localStorage.getItem(EDITOR_KEY)).toBeNull();
    expect(show).toHaveBeenCalled();
  });

  it("clearAllAppData removes persisted editor and template keys", () => {
    localStorage.setItem(EDITOR_KEY, JSON.stringify({ state: {}, version: 1 }));
    localStorage.setItem("wordhtml-templates", JSON.stringify({ templates: [] }));
    clearAllAppData();
    expect(localStorage.getItem(EDITOR_KEY)).toBeNull();
    expect(localStorage.getItem("wordhtml-templates")).toBeNull();
  });
});
