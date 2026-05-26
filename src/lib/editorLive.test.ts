import { describe, expect, it, vi } from "vitest";
import { editorCan, isLiveEditor } from "./editorLive";
import type { Editor } from "@tiptap/react";

function mockEditor(overrides: Partial<Editor> = {}): Editor {
  return {
    isDestroyed: false,
    can: vi.fn(() => ({
      undo: () => true,
      toggleBold: () => true,
    })),
    ...overrides,
  } as unknown as Editor;
}

describe("isLiveEditor", () => {
  it("returns false for null and undefined", () => {
    expect(isLiveEditor(null)).toBe(false);
    expect(isLiveEditor(undefined)).toBe(false);
  });

  it("returns false when editor is destroyed", () => {
    expect(isLiveEditor(mockEditor({ isDestroyed: true }))).toBe(false);
  });

  it("returns true for a live editor", () => {
    expect(isLiveEditor(mockEditor())).toBe(true);
  });
});

describe("editorCan", () => {
  it("returns false without calling can when editor is null", () => {
    const check = vi.fn(() => true);
    expect(editorCan(null, check)).toBe(false);
    expect(check).not.toHaveBeenCalled();
  });

  it("returns false without calling can when editor is destroyed", () => {
    const editor = mockEditor({ isDestroyed: true });
    const check = vi.fn(() => true);
    expect(editorCan(editor, check)).toBe(false);
    expect(check).not.toHaveBeenCalled();
  });

  it("delegates to editor.can() when live", () => {
    const editor = mockEditor();
    expect(editorCan(editor, (c) => c.undo())).toBe(true);
    expect(editor.can).toHaveBeenCalled();
  });

  it("returns false when can() throws", () => {
    const editor = mockEditor({
      can: vi.fn(() => {
        throw new Error("commandManager is null");
      }),
    });
    expect(editorCan(editor, (c) => c.undo())).toBe(false);
  });
});
