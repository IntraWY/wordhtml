import { describe, it, expect, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { jumpToMergeField } from "./jumpToMergeField";

interface MockOptions {
  results?: Array<{ from: number; to: number }>;
  isDestroyed?: boolean;
  withSearchCommands?: boolean;
}

function makeEditor({
  results = [],
  isDestroyed = false,
  withSearchCommands = true,
}: MockOptions = {}) {
  const commands: Record<string, ReturnType<typeof vi.fn>> = {
    focus: vi.fn(() => true),
  };
  if (withSearchCommands) {
    // The real extension's commands only mutate storage and return false.
    commands.setSearchTerm = vi.fn(() => false);
    commands.resetIndex = vi.fn(() => false);
  }
  const editor = {
    isDestroyed,
    commands,
    storage: { searchAndReplace: { results } },
  } as unknown as Editor;
  return { editor, commands };
}

describe("jumpToMergeField", () => {
  it("returns true and moves the caret when the field is found", () => {
    const { editor, commands } = makeEditor({
      results: [{ from: 12, to: 22 }, { from: 40, to: 50 }],
    });

    const found = jumpToMergeField(editor, "customer");

    expect(found).toBe(true);
    expect(commands.setSearchTerm).toHaveBeenCalledWith("{{customer}}");
    expect(commands.resetIndex).toHaveBeenCalled();
    expect(commands.focus).toHaveBeenCalledWith(12);
  });

  it("returns false when the field is not in the document", () => {
    const { editor, commands } = makeEditor({ results: [] });

    const found = jumpToMergeField(editor, "missing");

    expect(found).toBe(false);
    expect(commands.setSearchTerm).toHaveBeenCalledWith("{{missing}}");
    expect(commands.focus).not.toHaveBeenCalled();
  });

  it("returns false when the search extension is not registered", () => {
    const { editor, commands } = makeEditor({
      results: [{ from: 1, to: 5 }],
      withSearchCommands: false,
    });

    expect(jumpToMergeField(editor, "x")).toBe(false);
    expect(commands.focus).not.toHaveBeenCalled();
  });

  it("returns false when the editor is destroyed", () => {
    const { editor, commands } = makeEditor({
      results: [{ from: 1, to: 5 }],
      isDestroyed: true,
    });

    expect(jumpToMergeField(editor, "x")).toBe(false);
    expect(commands.setSearchTerm).not.toHaveBeenCalled();
  });

  it("returns false when searchAndReplace storage is absent", () => {
    const { editor, commands } = makeEditor();
    (editor as unknown as { storage: Record<string, unknown> }).storage = {};

    expect(jumpToMergeField(editor, "x")).toBe(false);
    expect(commands.focus).not.toHaveBeenCalled();
  });
});
