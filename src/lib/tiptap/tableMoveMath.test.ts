import { describe, it, expect } from "vitest";
import { targetIndexFromY } from "./tableMoveMath";

describe("targetIndexFromY", () => {
  it("returns 0 when the pointer is above every block", () => {
    expect(targetIndexFromY(5, [10, 20, 30])).toBe(0);
  });

  it("returns the count of midpoints above the pointer", () => {
    expect(targetIndexFromY(25, [10, 20, 30])).toBe(2);
  });

  it("returns length when the pointer is below every block", () => {
    expect(targetIndexFromY(100, [10, 20, 30])).toBe(3);
  });

  it("returns 0 for no candidate blocks", () => {
    expect(targetIndexFromY(50, [])).toBe(0);
  });

  it("treats a midpoint exactly at the pointer as below (stays before it)", () => {
    expect(targetIndexFromY(20, [10, 20, 30])).toBe(1);
  });
});
