import { describe, it, expect } from "vitest";
import {
  attrsForLayoutMode,
  layoutModeFromAttrs,
  isFloatingMode,
  BEHIND_Z_INDEX,
  FRONT_Z_INDEX,
  type ImageLayoutMode,
} from "./imageLayout";

const MODES: ImageLayoutMode[] = [
  "block",
  "wrapLeft",
  "wrapRight",
  "center",
  "front",
  "behind",
];

describe("layoutModeFromAttrs", () => {
  it("maps in-flow align values", () => {
    expect(layoutModeFromAttrs({ align: null, float: null })).toBe("block");
    expect(layoutModeFromAttrs({ align: "left", float: null })).toBe("wrapLeft");
    expect(layoutModeFromAttrs({ align: "right", float: null })).toBe("wrapRight");
    expect(layoutModeFromAttrs({ align: "center", float: null })).toBe("center");
  });

  it("maps floating to front when z-index is non-negative", () => {
    expect(layoutModeFromAttrs({ float: true, zIndex: 5 })).toBe("front");
    expect(layoutModeFromAttrs({ float: true, zIndex: 0 })).toBe("front");
    // float wins over a stale align value
    expect(layoutModeFromAttrs({ float: true, align: "left", zIndex: 5 })).toBe("front");
  });

  it("maps floating to behind when z-index is negative", () => {
    expect(layoutModeFromAttrs({ float: true, zIndex: -1 })).toBe("behind");
    expect(layoutModeFromAttrs({ float: true, zIndex: BEHIND_Z_INDEX })).toBe("behind");
  });

  it("treats a missing z-index on a floating image as front", () => {
    expect(layoutModeFromAttrs({ float: true })).toBe("front");
  });
});

describe("attrsForLayoutMode", () => {
  it("front floats in front of text", () => {
    expect(attrsForLayoutMode("front")).toEqual({
      align: null,
      float: true,
      zIndex: FRONT_Z_INDEX,
    });
  });

  it("behind floats behind text with a negative z-index", () => {
    expect(attrsForLayoutMode("behind")).toEqual({
      align: null,
      float: true,
      zIndex: BEHIND_Z_INDEX,
    });
    expect(attrsForLayoutMode("behind").zIndex).toBeLessThan(0);
  });

  it("wrap modes set align and clear float", () => {
    expect(attrsForLayoutMode("wrapLeft")).toMatchObject({ align: "left", float: null });
    expect(attrsForLayoutMode("wrapRight")).toMatchObject({ align: "right", float: null });
    expect(attrsForLayoutMode("center")).toMatchObject({ align: "center", float: null });
  });

  it("block clears both align and float", () => {
    expect(attrsForLayoutMode("block")).toMatchObject({ align: null, float: null });
  });

  it("in-flow modes reset z-index to front so re-floating starts clean", () => {
    for (const mode of ["block", "wrapLeft", "wrapRight", "center"] as const) {
      expect(attrsForLayoutMode(mode).zIndex).toBe(FRONT_Z_INDEX);
    }
  });
});

describe("round-trip: attrsForLayoutMode → layoutModeFromAttrs", () => {
  it("recovers every mode", () => {
    for (const mode of MODES) {
      const attrs = attrsForLayoutMode(mode);
      expect(layoutModeFromAttrs(attrs)).toBe(mode);
    }
  });
});

describe("isFloatingMode", () => {
  it("is true only for front and behind", () => {
    expect(isFloatingMode("front")).toBe(true);
    expect(isFloatingMode("behind")).toBe(true);
    expect(isFloatingMode("block")).toBe(false);
    expect(isFloatingMode("wrapLeft")).toBe(false);
    expect(isFloatingMode("wrapRight")).toBe(false);
    expect(isFloatingMode("center")).toBe(false);
  });
});
