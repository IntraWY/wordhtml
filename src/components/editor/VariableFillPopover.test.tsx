import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";

import { VariableFillPopover } from "./VariableFillPopover";
import { dispatchFillVariable } from "@/lib/events";

afterEach(() => cleanup());

function openPopover() {
  act(() => {
    dispatchFillVariable({
      name: "ชื่องาน",
      rect: { left: 120, top: 40, bottom: 60, width: 90 },
    });
  });
}

describe("VariableFillPopover — reposition on scroll/resize", () => {
  it("registers scroll (capture) + resize listeners while open and removes them on close", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");

    render(<VariableFillPopover editor={null} />);
    openPopover();

    expect(screen.queryByRole("dialog")).not.toBeNull();
    const scrollAdds = add.mock.calls.filter(([type]) => type === "scroll");
    expect(scrollAdds.some(([, , opts]) => opts === true)).toBe(true);
    expect(add.mock.calls.some(([type]) => type === "resize")).toBe(true);

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(remove.mock.calls.some(([type]) => type === "scroll")).toBe(true);
    expect(remove.mock.calls.some(([type]) => type === "resize")).toBe(true);

    add.mockRestore();
    remove.mockRestore();
  });

  it("re-anchors to the live badge position on scroll", () => {
    // A badge for the variable exists in the DOM at a different spot than the
    // captured open rect — a scroll should re-measure it via reposition().
    const badge = document.createElement("span");
    badge.className = "variable-badge";
    badge.setAttribute("data-variable", "ชื่องาน");
    badge.getBoundingClientRect = () =>
      ({ left: 300, top: 200, bottom: 220, width: 70 }) as DOMRect;
    document.body.appendChild(badge);

    render(<VariableFillPopover editor={null} />);
    openPopover();

    const dialog = screen.getByRole("dialog");
    // Initial render uses the captured rect (bottom 60 → top 66, left 120).
    expect(dialog.style.top).toBe("66px");
    expect(dialog.style.left).toBe("120px");

    // After a scroll, it re-anchors to the live badge (bottom 220 → top 226).
    act(() => {
      fireEvent.scroll(window);
    });
    expect(dialog.style.top).toBe("226px");
    expect(dialog.style.left).toBe("300px");

    document.body.removeChild(badge);
  });
});
