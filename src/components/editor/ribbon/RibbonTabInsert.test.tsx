import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { RibbonTabInsert } from "./RibbonTabInsert";

function createMockEditor() {
  const insertTable = vi.fn().mockReturnThis();
  const insertContent = vi.fn().mockReturnThis();
  const focus = vi.fn().mockReturnThis();
  const run = vi.fn();
  const chain = vi.fn(() => ({ focus, insertTable, insertContent, run }));

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
    insertContent,
    run,
  };
}

describe("RibbonTabInsert table picker", () => {
  it("opens the size grid and inserts the hovered table size", () => {
    const mock = createMockEditor();
    render(<RibbonTabInsert editor={mock.editor} />);

    fireEvent.click(
      screen.getByRole("button", { name: "แทรกตาราง (Insert table)" })
    );
    fireEvent.click(screen.getByRole("button", { name: "ตาราง 2×4" }));

    expect(mock.chain).toHaveBeenCalled();
    expect(mock.focus).toHaveBeenCalled();
    // Forms-first default: no header row (toggleable later from the menu).
    expect(mock.insertTable).toHaveBeenCalledWith({
      rows: 2,
      cols: 4,
      withHeaderRow: false,
    });
    expect(mock.run).toHaveBeenCalled();
  });

  it("closes the grid after inserting", () => {
    const mock = createMockEditor();
    render(<RibbonTabInsert editor={mock.editor} />);

    fireEvent.click(
      screen.getByRole("button", { name: "แทรกตาราง (Insert table)" })
    );
    fireEvent.click(screen.getByRole("button", { name: "ตาราง 1×1" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("RibbonTabInsert check symbols", () => {
  it("inserts the checkbox character at the cursor", () => {
    const mock = createMockEditor();
    render(<RibbonTabInsert editor={mock.editor} />);

    fireEvent.click(
      screen.getByRole("button", { name: "ช่องติ๊กถูก (Checked box)" })
    );

    expect(mock.insertContent).toHaveBeenCalledWith("☑");
    expect(mock.run).toHaveBeenCalled();
  });
});
