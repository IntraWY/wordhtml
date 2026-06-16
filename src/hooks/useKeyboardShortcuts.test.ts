import { describe, it, expect } from "vitest";
import { shouldIgnoreShortcut } from "./useKeyboardShortcuts";

describe("shouldIgnoreShortcut", () => {
  it("ignores shortcuts while typing in a plain INPUT", () => {
    const input = document.createElement("input");
    expect(shouldIgnoreShortcut(input)).toBe(true);
  });

  it("ignores shortcuts while typing in a TEXTAREA", () => {
    const ta = document.createElement("textarea");
    expect(shouldIgnoreShortcut(ta)).toBe(true);
  });

  it("does NOT ignore shortcuts in the contentEditable editor surface", () => {
    // Regression: the ProseMirror document is contentEditable; Ctrl+S / Ctrl+F
    // must still fire there (this was the bug — all shortcuts were dead in the
    // editor because the guard bailed on isContentEditable).
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    // Only INPUT/TEXTAREA are skipped — a contentEditable host is not.
    expect(shouldIgnoreShortcut(editor)).toBe(false);
  });

  it("does NOT ignore shortcuts for a non-field element", () => {
    const div = document.createElement("div");
    expect(shouldIgnoreShortcut(div)).toBe(false);
  });

  it("returns false for null / non-element targets", () => {
    expect(shouldIgnoreShortcut(null)).toBe(false);
  });
});
