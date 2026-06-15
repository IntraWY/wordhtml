import { describe, it, expect, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { goToSearchResult, getSearchResultInfo } from "./searchNavigation";

interface MockOptions {
  results?: Array<{ from: number; to: number }>;
  resultIndex?: number;
  isDestroyed?: boolean;
  withNavCommands?: boolean;
  noStorage?: boolean;
}

/**
 * The real extension's nextSearchResult/previousSearchResult only advance
 * `storage.resultIndex` (wrapping), so the mock does the same and we assert
 * the helper then focuses the now-current result range.
 */
function makeEditor({
  results = [],
  resultIndex = 0,
  isDestroyed = false,
  withNavCommands = true,
  noStorage = false,
}: MockOptions = {}) {
  const storage = { searchAndReplace: { results, resultIndex } };
  const commands: Record<string, ReturnType<typeof vi.fn>> = {
    focus: vi.fn(() => true),
  };
  if (withNavCommands) {
    commands.nextSearchResult = vi.fn(() => {
      if (results.length > 0) {
        storage.searchAndReplace.resultIndex =
          (storage.searchAndReplace.resultIndex + 1) % results.length;
      }
      return false;
    });
    commands.previousSearchResult = vi.fn(() => {
      if (results.length > 0) {
        storage.searchAndReplace.resultIndex =
          (storage.searchAndReplace.resultIndex - 1 + results.length) %
          results.length;
      }
      return false;
    });
  }
  const editor = {
    isDestroyed,
    commands,
    storage: noStorage ? {} : storage,
  } as unknown as Editor;
  return { editor, commands, storage };
}

describe("goToSearchResult", () => {
  it("advances to the next match and focuses it", () => {
    const { editor, commands } = makeEditor({
      results: [{ from: 10, to: 14 }, { from: 30, to: 34 }],
      resultIndex: 0,
    });

    const ok = goToSearchResult(editor, "next");

    expect(ok).toBe(true);
    expect(commands.nextSearchResult).toHaveBeenCalled();
    expect(commands.focus).toHaveBeenCalledWith(30); // index 1
  });

  it("wraps to the first match after the last", () => {
    const { editor, commands } = makeEditor({
      results: [{ from: 10, to: 14 }, { from: 30, to: 34 }],
      resultIndex: 1,
    });

    goToSearchResult(editor, "next");

    expect(commands.focus).toHaveBeenCalledWith(10); // wrapped to index 0
  });

  it("steps to the previous match and focuses it", () => {
    const { editor, commands } = makeEditor({
      results: [{ from: 10, to: 14 }, { from: 30, to: 34 }],
      resultIndex: 1,
    });

    const ok = goToSearchResult(editor, "previous");

    expect(ok).toBe(true);
    expect(commands.previousSearchResult).toHaveBeenCalled();
    expect(commands.focus).toHaveBeenCalledWith(10); // index 0
  });

  it("returns false when there are no matches", () => {
    const { editor, commands } = makeEditor({ results: [] });

    expect(goToSearchResult(editor, "next")).toBe(false);
    expect(commands.focus).not.toHaveBeenCalled();
  });

  it("returns false when the navigation commands are missing", () => {
    const { editor, commands } = makeEditor({
      results: [{ from: 1, to: 5 }],
      withNavCommands: false,
    });

    expect(goToSearchResult(editor, "next")).toBe(false);
    expect(commands.focus).not.toHaveBeenCalled();
  });

  it("returns false when the editor is destroyed", () => {
    const { editor, commands } = makeEditor({
      results: [{ from: 1, to: 5 }],
      isDestroyed: true,
    });

    expect(goToSearchResult(editor, "next")).toBe(false);
    expect(commands.focus).not.toHaveBeenCalled();
  });

  it("returns false for a null editor", () => {
    expect(goToSearchResult(null, "next")).toBe(false);
  });
});

describe("getSearchResultInfo", () => {
  it("reports a 1-based index and total", () => {
    const { editor } = makeEditor({
      results: [{ from: 1, to: 2 }, { from: 3, to: 4 }, { from: 5, to: 6 }],
      resultIndex: 1,
    });

    expect(getSearchResultInfo(editor)).toEqual({ index: 2, total: 3 });
  });

  it("reports zero when there are no matches", () => {
    const { editor } = makeEditor({ results: [] });

    expect(getSearchResultInfo(editor)).toEqual({ index: 0, total: 0 });
  });

  it("reports zero for a null editor", () => {
    expect(getSearchResultInfo(null)).toEqual({ index: 0, total: 0 });
  });

  it("reports zero when searchAndReplace storage is absent", () => {
    const { editor } = makeEditor({ noStorage: true });

    expect(getSearchResultInfo(editor)).toEqual({ index: 0, total: 0 });
  });
});
