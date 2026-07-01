import { describe, it, expect } from "vitest";
import { computeRowHeight, MIN_ROW_PX } from "./rowResizeMath";

describe("computeRowHeight", () => {
  it("adds a positive delta (drag down = taller)", () => {
    expect(computeRowHeight(40, 15)).toBe(55);
  });

  it("subtracts a negative delta (drag up = shorter)", () => {
    expect(computeRowHeight(40, -10)).toBe(30);
  });

  it("clamps to MIN_ROW_PX when the drag would go below it", () => {
    expect(computeRowHeight(30, -100)).toBe(MIN_ROW_PX);
  });

  it("respects a custom minimum", () => {
    expect(computeRowHeight(50, -40, 25)).toBe(25);
  });

  it("rounds fractional pixels to an integer", () => {
    expect(computeRowHeight(40.4, 10.3)).toBe(51);
  });

  it("returns an unchanged (rounded) height for a zero delta", () => {
    expect(computeRowHeight(48, 0)).toBe(48);
  });

  it("falls back to the floor when startHeight is not finite", () => {
    expect(computeRowHeight(Number.NaN, 5)).toBe(MIN_ROW_PX);
  });

  it("treats a non-finite delta as zero", () => {
    expect(computeRowHeight(40, Number.POSITIVE_INFINITY)).toBe(40);
  });
});
