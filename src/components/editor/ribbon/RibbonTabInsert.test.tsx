import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { RibbonTabInsert } from "./RibbonTabInsert";

function createMockEditor() {
  const insertTable = vi.fn().mockReturnThis();
  const focus = vi.fn().mockReturnThis();
  const run = vi.fn();
  const chain = vi.fn(() => ({ focus, insertTable, run }));

  const editor = {
    chain,
    isActive: vi.fn(() => false),
    getAttributes: vi.fn(() => ({})),
  } as unknown as Editor;

  return {
    editor,
    chain,
    focus,
    insertTable,
    run,
  };
}

describe("RibbonTabInsert table picker", () => {
  it("inserts a default table", () => {
    const mock = createMockEditor();
    render(<RibbonTabInsert editor={mock.editor} />);

    fireEvent.click(screen.getByRole("button", { name: "แทรกตาราง" }));

    expect(mock.chain).toHaveBeenCalled();
    expect(mock.focus).toHaveBeenCalled();
    expect(mock.insertTable).toHaveBeenCalledWith({
      rows: 3,
      cols: 3,
      withHeaderRow: true,
    });
    expect(mock.run).toHaveBeenCalled();
  });

  // NOTE: The insert ribbon uses a single-click default insert (3×3).
  // Custom table sizing is available via the menu bar table actions.
});

