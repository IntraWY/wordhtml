import { describe, it, expect } from "vitest";
import { getPageDimensionsPx, mmToPx, A4 } from "./page";

describe("getPageDimensionsPx", () => {
  it("matches Math.round(mmToPx) used by pageNode", () => {
    const { heightPx, widthPx } = getPageDimensionsPx({
      size: "A4",
      orientation: "portrait",
      marginMm: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
    });
    expect(heightPx).toBe(Math.round(mmToPx(A4.hMm)));
    expect(widthPx).toBe(Math.round(mmToPx(A4.wMm)));
  });
});
