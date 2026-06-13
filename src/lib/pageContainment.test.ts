import { describe, expect, it } from "vitest";
import {
  CONTAINMENT_PAGE_THRESHOLD,
  intrinsicPageSize,
  shouldContainPages,
} from "./pageContainment";
import { getPageDimensionsPx, PAGE_STACK_GAP_PX } from "./page";
import type { PageSetup } from "@/types";

function makeSetup(over: Partial<PageSetup> = {}): PageSetup {
  return {
    size: "A4",
    orientation: "portrait",
    marginMm: { top: 25, right: 25, bottom: 25, left: 25 },
    ...over,
  } as PageSetup;
}

describe("shouldContainPages", () => {
  it("is off below the threshold", () => {
    expect(shouldContainPages(0)).toBe(false);
    expect(shouldContainPages(1)).toBe(false);
    expect(shouldContainPages(CONTAINMENT_PAGE_THRESHOLD - 1)).toBe(false);
  });

  it("turns on at and above the threshold", () => {
    expect(shouldContainPages(CONTAINMENT_PAGE_THRESHOLD)).toBe(true);
    expect(shouldContainPages(CONTAINMENT_PAGE_THRESHOLD + 1)).toBe(true);
    expect(shouldContainPages(100)).toBe(true);
  });
});

describe("intrinsicPageSize", () => {
  it("matches A4 portrait dimensions plus the stack gap", () => {
    const setup = makeSetup();
    const dims = getPageDimensionsPx(setup);
    const intrinsic = intrinsicPageSize(setup);
    expect(intrinsic.widthPx).toBe(dims.widthPx);
    expect(intrinsic.heightPx).toBe(dims.heightPx + PAGE_STACK_GAP_PX);
  });

  it("is page-size aware (A4 portrait ~ 794x1123)", () => {
    const intrinsic = intrinsicPageSize(makeSetup());
    expect(intrinsic.widthPx).toBe(794);
    expect(intrinsic.heightPx).toBe(1123 + PAGE_STACK_GAP_PX);
  });

  it("swaps width/height for landscape", () => {
    const portrait = intrinsicPageSize(makeSetup({ orientation: "portrait" }));
    const landscape = intrinsicPageSize(makeSetup({ orientation: "landscape" }));
    expect(landscape.widthPx).toBe(portrait.heightPx - PAGE_STACK_GAP_PX);
    expect(landscape.heightPx - PAGE_STACK_GAP_PX).toBe(portrait.widthPx);
  });

  it("differs for Letter vs A4", () => {
    const a4 = intrinsicPageSize(makeSetup({ size: "A4" }));
    const letter = intrinsicPageSize(makeSetup({ size: "Letter" }));
    expect(letter.widthPx).not.toBe(a4.widthPx);
    expect(letter.heightPx).not.toBe(a4.heightPx);
  });
});
