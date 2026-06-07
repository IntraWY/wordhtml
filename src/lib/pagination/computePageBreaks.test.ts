import { describe, it, expect } from "vitest";
import { computePageBreaks } from "./computePageBreaks";

describe("computePageBreaks", () => {
  const LIMIT = 900;

  it("keeps content on one page when it fits", () => {
    expect(computePageBreaks([100, 200, 300], LIMIT, {})).toEqual([]);
  });

  it("supports a per-page limit (A2 different first page)", () => {
    // First page smaller (500), rest 900. Blocks of 300 each.
    // Page 0 (limit 500): 300+300=600 > 500 -> break at 1; page 0 = [0]
    // Page 1 (limit 900): 300+300+300=900 fits -> [1,2,3]; +300 -> break at 4
    // Page 2 (limit 900): [4...]
    const heights = Array(7).fill(300);
    const limitFor = (p: number) => (p === 0 ? 500 : 900);
    const breaks = computePageBreaks(heights, limitFor, {});
    // page0:[0] page1:[1,2,3] page2:[4,5,6]
    expect(breaks).toEqual([1, 4]);
  });

  it("constant-limit behavior is unchanged when passed a number", () => {
    expect(computePageBreaks([400, 400, 400], 900, {})).toEqual([2]);
  });

  it("breaks before the block that would overflow", () => {
    // 400+400=800 fits; +400 -> 1200 overflows -> break before index 2
    expect(computePageBreaks([400, 400, 400], LIMIT, {})).toEqual([2]);
  });

  it("fills each page to the limit (no near-empty trailing pages)", () => {
    const heights = Array(10).fill(300); // 3000 total, limit 900 -> 3 per page
    const breaks = computePageBreaks(heights, LIMIT, {});
    // pages: [0..2][3..5][6..8][9] -> breaks at 3,6,9
    expect(breaks).toEqual([3, 6, 9]);
  });

  it("never places more than the limit on a non-atomic page", () => {
    const heights = [500, 500, 500, 500];
    const breaks = computePageBreaks(heights, LIMIT, {});
    let start = 0;
    for (const b of [...breaks, heights.length]) {
      const sum = heights.slice(start, b).reduce((a, c) => a + c, 0);
      expect(sum).toBeLessThanOrEqual(LIMIT);
      start = b;
    }
  });

  it("places an oversized atomic block alone on its own page", () => {
    // index 1 is atomic and taller than the limit
    const breaks = computePageBreaks([300, 1200, 300], LIMIT, {
      atomicOversize: new Set([1]),
    });
    expect(breaks).toEqual([1, 2]);
  });

  it("handles empty input", () => {
    expect(computePageBreaks([], LIMIT, {})).toEqual([]);
  });

  it("does not emit a break at the final index (no empty trailing page)", () => {
    const heights = [900, 900]; // each exactly fills a page
    const breaks = computePageBreaks(heights, LIMIT, {});
    expect(breaks).toEqual([1]);
    expect(breaks).not.toContain(heights.length);
  });
});
