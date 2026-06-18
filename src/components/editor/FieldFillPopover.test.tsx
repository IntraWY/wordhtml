import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";

import { FieldFillPopover } from "./FieldFillPopover";
import { dispatchFillField } from "@/lib/events";

afterEach(() => cleanup());

function openPopover() {
  act(() => {
    dispatchFillField({
      pos: 5,
      label: "ชื่อ",
      value: "",
      rect: { left: 100, top: 50, bottom: 70, width: 80 },
    });
  });
}

describe("FieldFillPopover — reposition on scroll/resize", () => {
  it("registers scroll (capture) + resize listeners while open and removes them on close", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");

    // editor=null → reposition falls back to the captured rect (no coordsAtPos).
    render(<FieldFillPopover editor={null} />);
    openPopover();

    // Opened popover anchors via the viewport-clamped position.
    expect(screen.queryByRole("dialog")).not.toBeNull();
    const scrollAdds = add.mock.calls.filter(([type]) => type === "scroll");
    expect(scrollAdds.some(([, , opts]) => opts === true)).toBe(true);
    expect(add.mock.calls.some(([type]) => type === "resize")).toBe(true);

    // Escape closes it and tears the listeners down.
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(remove.mock.calls.some(([type]) => type === "scroll")).toBe(true);
    expect(remove.mock.calls.some(([type]) => type === "resize")).toBe(true);

    add.mockRestore();
    remove.mockRestore();
  });

  it("clamps the popover within the viewport", () => {
    render(<FieldFillPopover editor={null} />);
    act(() => {
      dispatchFillField({
        pos: 1,
        label: "X",
        value: "",
        // far past the right edge — must clamp back inside
        rect: { left: 99999, top: 10, bottom: 30, width: 50 },
      });
    });
    const dialog = screen.getByRole("dialog");
    const left = parseFloat(dialog.style.left);
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left).toBeLessThanOrEqual(window.innerWidth);
  });
});
