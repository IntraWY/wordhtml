import { describe, it, expect } from "vitest";
import { computeFillBreaks, fitsWithinLimit, type FillItem } from "./fillBreaks";

const h = (heights: number[], atomic: number[] = []): FillItem[] =>
  heights.map((height, i) => ({ height, atomic: atomic.includes(i) }));

describe("fitsWithinLimit", () => {
  it("fits when extent is below the limit", () => {
    expect(fitsWithinLimit(500, 900)).toBe(true);
  });

  it("fits exactly at the limit (boundary)", () => {
    expect(fitsWithinLimit(900, 900)).toBe(true);
  });

  it("does not fit when extent exceeds the limit", () => {
    expect(fitsWithinLimit(901, 900)).toBe(false);
  });

  it("defaults to zero tolerance", () => {
    expect(fitsWithinLimit(901, 900)).toBe(false);
    expect(fitsWithinLimit(900, 900)).toBe(true);
  });

  it("honors a positive tolerance (preview's +1px)", () => {
    expect(fitsWithinLimit(901, 900, 1)).toBe(true);
    expect(fitsWithinLimit(902, 900, 1)).toBe(false);
  });
});

describe("computeFillBreaks", () => {
  const LIMIT = 900;

  it("keeps content on one page when it fits", () => {
    expect(computeFillBreaks(h([100, 200, 300]), LIMIT)).toEqual([]);
  });

  it("handles empty input", () => {
    expect(computeFillBreaks([], LIMIT)).toEqual([]);
  });

  it("handles a single block that fits", () => {
    expect(computeFillBreaks(h([300]), LIMIT)).toEqual([]);
  });

  it("handles a single block taller than the limit (non-atomic, stays alone)", () => {
    // A non-atomic over-tall single block can't break (i > pageStart is false),
    // so it occupies the only page; no break emitted.
    expect(computeFillBreaks(h([1500]), LIMIT)).toEqual([]);
  });

  it("breaks before the block that would overflow", () => {
    // 400+400=800 fits; +400 -> 1200 overflows -> break before index 2
    expect(computeFillBreaks(h([400, 400, 400]), LIMIT)).toEqual([2]);
  });

  it("fills each page to the limit (no near-empty trailing pages)", () => {
    const items = h(Array(10).fill(300)); // 3000 total, limit 900 -> 3 per page
    expect(computeFillBreaks(items, LIMIT)).toEqual([3, 6, 9]);
  });

  it("treats exact-fit at the boundary as fitting", () => {
    // 450+450=900 == limit -> still fits; +450 overflows -> break at 2
    expect(computeFillBreaks(h([450, 450, 450]), LIMIT)).toEqual([2]);
  });

  it("never exceeds the limit on a non-atomic page", () => {
    const heights = [500, 500, 500, 500];
    const breaks = computeFillBreaks(h(heights), LIMIT);
    let start = 0;
    for (const b of [...breaks, heights.length]) {
      const sum = heights.slice(start, b).reduce((a, c) => a + c, 0);
      expect(sum).toBeLessThanOrEqual(LIMIT);
      start = b;
    }
  });

  it("places an oversized atomic block alone on its own page", () => {
    // index 1 is atomic and taller than the limit
    const breaks = computeFillBreaks(h([300, 1200, 300], [1]), LIMIT);
    expect(breaks).toEqual([1, 2]);
  });

  it("gives a leading atomic block its own page without an empty page before it", () => {
    const breaks = computeFillBreaks(h([1200, 300], [0]), LIMIT);
    expect(breaks).toEqual([1]);
  });

  it("does not emit a break at the final index (no empty trailing page)", () => {
    const heights = [900, 900];
    const breaks = computeFillBreaks(h(heights), LIMIT);
    expect(breaks).toEqual([1]);
    expect(breaks).not.toContain(heights.length);
  });

  it("supports a per-page limit function (A2 different first page)", () => {
    const items = h(Array(7).fill(300));
    const limitFor = (p: number) => (p === 0 ? 500 : 900);
    // page0:[0] page1:[1,2,3] page2:[4,5,6]
    expect(computeFillBreaks(items, limitFor)).toEqual([1, 4]);
  });

  it("applies a positive tolerance to the fill comparison", () => {
    // 450+451=901: with tolerance 1, 901 <= 900+1 fits; +450 overflows.
    expect(computeFillBreaks(h([450, 451, 450]), 900, { tolerancePx: 1 })).toEqual([2]);
    // Same heights, zero tolerance: 901 > 900 -> break at 1.
    expect(computeFillBreaks(h([450, 451, 450]), 900)).toEqual([1, 2]);
  });
});
