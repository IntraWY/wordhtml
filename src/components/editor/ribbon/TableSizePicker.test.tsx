import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { TableSizePicker } from "./TableSizePicker";

function createMockEditor() {
  const insertTable = vi.fn().mockReturnThis();
  const focus = vi.fn().mockReturnThis();
  const run = vi.fn();
  const chain = vi.fn(() => ({ focus, insertTable, run }));
  const editor = { chain } as unknown as Editor;
  return { editor, chain, focus, insertTable, run };
}

function openPicker() {
  fireEvent.click(
    screen.getByRole("button", { name: "แทรกตาราง (Insert table)" })
  );
}

describe("TableSizePicker — escapes overflow clipping", () => {
  it("portals the popover out of an overflow ancestor (so it is not clipped)", () => {
    const { editor } = createMockEditor();
    render(
      // mimics Ribbon.tsx's overflow-x-auto scroll container that was clipping it
      <div data-testid="clip" style={{ overflow: "auto" }}>
        <TableSizePicker editor={editor} />
      </div>
    );

    openPicker();

    const dialog = screen.getByRole("dialog", {
      name: "เลือกขนาดตาราง (Pick table size)",
    });
    const clip = screen.getByTestId("clip");

    // The popover must NOT live inside the overflow container — it is portaled to body.
    expect(clip.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
    // fixed positioning is what makes the portaled popover track the button.
    expect(dialog.style.position).toBe("fixed");
  });

  it("stays open when interacting inside the portaled popover", () => {
    const { editor } = createMockEditor();
    render(<TableSizePicker editor={editor} />);

    openPicker();
    const dialog = screen.getByRole("dialog");
    // A mousedown inside the popover (now outside the trigger's DOM subtree) must not close it.
    fireEvent.mouseDown(dialog);

    expect(screen.queryByRole("dialog")).not.toBeNull();
  });

  it("closes on an outside click", () => {
    const { editor } = createMockEditor();
    render(<TableSizePicker editor={editor} />);

    openPicker();
    expect(screen.queryByRole("dialog")).not.toBeNull();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
