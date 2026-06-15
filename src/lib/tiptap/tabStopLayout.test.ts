import { describe, it, expect } from "vitest";
import { PX_PER_CM } from "@/lib/page";
import {
  nextStop,
  computeTabWidth,
  decimalPrefix,
  zipTabStops,
  remapTabStopTypes,
  MIN_TAB_WIDTH_PX,
  type TabStopSpec,
  type TabType,
} from "./tabStopLayout";

const cm = (v: number) => v * PX_PER_CM;

describe("nextStop", () => {
  const stops: TabStopSpec[] = [
    { pos: 1.5, type: "left" },
    { pos: 4, type: "center" },
    { pos: 8.25, type: "right" },
  ];

  it("picks the first stop greater than x", () => {
    expect(nextStop(0, stops, 1.27)?.targetPx).toBeCloseTo(cm(1.5), 3);
    expect(nextStop(cm(2), stops, 1.27)?.targetPx).toBeCloseTo(cm(4), 3);
    expect(nextStop(cm(5), stops, 1.27)?.targetPx).toBeCloseTo(cm(8.25), 3);
  });

  it("carries the stop's alignment type", () => {
    expect(nextStop(cm(2), stops, 1.27)?.type).toBe("center");
    expect(nextStop(cm(5), stops, 1.27)?.type).toBe("right");
  });

  it("advances PAST a stop the tab already sits on", () => {
    expect(nextStop(cm(1.5), stops, 1.27)?.targetPx).toBeCloseTo(cm(4), 3);
  });

  it("falls back to the default grid past the last stop", () => {
    const t = nextStop(cm(9), stops, 1.27);
    expect(t?.type).toBe("left");
    // next multiple of 1.27cm above 9cm = 7.087.. wait grid is absolute from 0
    const stepPx = cm(1.27);
    expect(t!.targetPx).toBeGreaterThan(cm(9));
    expect(t!.targetPx % stepPx).toBeCloseTo(0, 3);
  });

  it("skips bar stops for advancement", () => {
    const withBar: TabStopSpec[] = [
      { pos: 2, type: "bar" },
      { pos: 5, type: "left" },
    ];
    expect(nextStop(0, withBar, 1.27)?.targetPx).toBeCloseTo(cm(5), 3);
  });
});

describe("computeTabWidth", () => {
  const startX = cm(1);
  const target = { targetPx: cm(8), type: "left" as const };
  const runW = cm(2);

  it("left: run starts at the stop", () => {
    expect(computeTabWidth(startX, target, runW, 0)).toBeCloseTo(cm(7), 3);
  });

  it("right: run ends at the stop", () => {
    const t = { targetPx: cm(8), type: "right" as const };
    expect(computeTabWidth(startX, t, runW, 0)).toBeCloseTo(cm(8) - runW - startX, 3);
  });

  it("center: run is centered on the stop", () => {
    const t = { targetPx: cm(8), type: "center" as const };
    expect(computeTabWidth(startX, t, runW, 0)).toBeCloseTo(cm(8) - runW / 2 - startX, 3);
  });

  it("decimal: separator sits on the stop", () => {
    const t = { targetPx: cm(8), type: "decimal" as const };
    const prefixW = cm(0.7);
    expect(computeTabWidth(startX, t, runW, prefixW)).toBeCloseTo(cm(8) - prefixW - startX, 3);
  });

  it("clamps to a minimum width (never negative/overlapping)", () => {
    const t = { targetPx: cm(1.2), type: "right" as const };
    expect(computeTabWidth(startX, t, cm(5), 0)).toBe(MIN_TAB_WIDTH_PX);
  });
});

describe("decimalPrefix", () => {
  it("returns text before the decimal point", () => {
    expect(decimalPrefix("1,234.75")).toBe("1,234");
    expect(decimalPrefix("12.50")).toBe("12");
  });
  it("returns the whole run when there is no decimal point", () => {
    expect(decimalPrefix("500")).toBe("500");
  });
});

describe("zipTabStops", () => {
  it("pairs positions with types, defaulting missing to left", () => {
    expect(zipTabStops([1, 2, 3], ["center", "right"])).toEqual([
      { pos: 1, type: "center" },
      { pos: 2, type: "right" },
      { pos: 3, type: "left" },
    ]);
  });
  it("defaults all to left for legacy docs without a types list", () => {
    expect(zipTabStops([1, 2], undefined)).toEqual([
      { pos: 1, type: "left" },
      { pos: 2, type: "left" },
    ]);
  });
});

describe("remapTabStopTypes", () => {
  const T = (...t: TabType[]) => t;

  it("keeps types when positions are unchanged", () => {
    expect(remapTabStopTypes([1, 4, 8], T("left", "center", "right"), [1, 4, 8], "left")).toEqual(
      T("left", "center", "right")
    );
  });

  it("follows types through a reorder/sort (match by value)", () => {
    expect(remapTabStopTypes([8, 1, 4], T("right", "left", "center"), [1, 4, 8], "left")).toEqual(
      T("left", "center", "right")
    );
  });

  it("preserves a moved stop's type", () => {
    // the stop at 4(center) is dragged to 5
    expect(remapTabStopTypes([1, 4, 8], T("left", "center", "right"), [1, 5, 8], "decimal")).toEqual(
      T("left", "center", "right")
    );
  });

  it("assigns the default (corner) type to a newly added stop", () => {
    expect(remapTabStopTypes([1, 4], T("left", "center"), [1, 4, 9], "decimal")).toEqual(
      T("left", "center", "decimal")
    );
  });

  it("drops the type of a removed stop", () => {
    expect(remapTabStopTypes([1, 4, 8], T("left", "center", "right"), [1, 8], "left")).toEqual(
      T("left", "right")
    );
  });

  it("seeds the first stop with the default type", () => {
    expect(remapTabStopTypes([], [], [3], "right")).toEqual(T("right"));
  });
});
