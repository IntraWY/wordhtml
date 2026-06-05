import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { RibbonTabHome } from "./RibbonTabHome";

function createMockEditor(activeStates: Record<string, boolean> = {}) {
  const isActive = vi.fn((nameOrAttrs: string | Record<string, unknown>, attrs?: Record<string, unknown>) => {
    if (typeof nameOrAttrs === "string" && attrs) {
      const key = `${nameOrAttrs}-${JSON.stringify(attrs)}`;
      return activeStates[key] ?? false;
    }
    const key = typeof nameOrAttrs === "string" ? nameOrAttrs : JSON.stringify(nameOrAttrs);
    return activeStates[key] ?? false;
  });

  return {
    chain: vi.fn(() => ({ focus: vi.fn().mockReturnThis(), run: vi.fn() })),
    isActive,
    getAttributes: vi.fn(() => ({})),
    can: vi.fn(() => ({ undo: () => false, redo: () => false })),
    on: vi.fn(),
    off: vi.fn(),
    state: { selection: {} },
  } as unknown as Editor;
}

describe("RibbonTabHome format button active states", () => {
  it("Bold button has aria-pressed=true when formatState.bold is true", () => {
    const editor = createMockEditor({ bold: true });
    render(<RibbonTabHome editor={editor} />);
    const boldBtn = screen.getByRole("button", { name: /ตัวหนา/i });
    expect(boldBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("Bold button has aria-pressed=false when not in bold text", () => {
    const editor = createMockEditor({ bold: false });
    render(<RibbonTabHome editor={editor} />);
    const boldBtn = screen.getByRole("button", { name: /ตัวหนา/i });
    expect(boldBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("Italic button reflects active state", () => {
    const editor = createMockEditor({ italic: true });
    render(<RibbonTabHome editor={editor} />);
    const btn = screen.getByRole("button", { name: /ตัวเอียง/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("BulletList button reflects active state", () => {
    const editor = createMockEditor({ bulletList: true });
    render(<RibbonTabHome editor={editor} />);
    const btn = screen.getByRole("button", { name: /รายการจุด/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("Heading1 button reflects active state", () => {
    const editor = createMockEditor({ 'heading-{"level":1}': true });
    render(<RibbonTabHome editor={editor} />);
    const btn = screen.getByRole("button", { name: /หัวเรื่อง 1/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("no format buttons are active when editor has no active marks", () => {
    const editor = createMockEditor({});
    render(<RibbonTabHome editor={editor} />);
    const boldBtn = screen.getByRole("button", { name: /ตัวหนา/i });
    const italicBtn = screen.getByRole("button", { name: /ตัวเอียง/i });
    expect(boldBtn).toHaveAttribute("aria-pressed", "false");
    expect(italicBtn).toHaveAttribute("aria-pressed", "false");
  });
});
