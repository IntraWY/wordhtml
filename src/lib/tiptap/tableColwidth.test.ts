import { describe, it, expect } from "vitest";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  readColumnWidths,
  resizeFromLeftEdge,
  resizeColumnBoundary,
} from "./tableColwidth";

// Duck-typed mocks — readColumnWidths only touches firstChild + row.forEach +
// cell.attrs, so a full ProseMirror schema is unnecessary for these unit tests.
function cell(colwidth: (number | null)[] | null, colspan = 1) {
  return { attrs: { colwidth, colspan } };
}
function table(cells: ReturnType<typeof cell>[] | null): PMNode {
  const firstRow = cells ? { forEach: (cb: (c: unknown) => void) => cells.forEach(cb) } : null;
  return { firstChild: firstRow } as unknown as PMNode;
}

describe("readColumnWidths", () => {
  it("reads per-column widths from the first row", () => {
    expect(readColumnWidths(table([cell([130]), cell([90])]))).toEqual([130, 90]);
  });

  it("expands colspan cells into multiple columns", () => {
    expect(readColumnWidths(table([cell([100, 50], 2), cell([80])]))).toEqual([
      100, 50, 80,
    ]);
  });

  it("maps missing / zero / null widths to null", () => {
    expect(readColumnWidths(table([cell(null), cell([0]), cell([70])]))).toEqual([
      null,
      null,
      70,
    ]);
  });

  it("returns null when the table has no row", () => {
    expect(readColumnWidths(table(null))).toBeNull();
  });
});

describe("resizeFromLeftEdge", () => {
  it("drag right: first column shrinks, indent grows, right edge fixed", () => {
    expect(resizeFromLeftEdge([130, 90], 30, 28, 0, Infinity)).toEqual({
      widths: [100, 90],
      indentPx: 30,
      appliedDeltaPx: 30,
    });
  });

  it("clamps the first column at cellMinWidth", () => {
    expect(resizeFromLeftEdge([50, 90], 100, 28, 0, Infinity)).toEqual({
      widths: [28, 90],
      indentPx: 22,
      appliedDeltaPx: 22,
    });
  });

  it("drag left stops at indent 0 (first column grows by the reduced amount)", () => {
    expect(resizeFromLeftEdge([100, 90], -40, 28, 10, Infinity)).toEqual({
      widths: [110, 90],
      indentPx: 0,
      appliedDeltaPx: -10,
    });
  });

  it("clamps indent to the max, pulling width back accordingly", () => {
    expect(resizeFromLeftEdge([100, 90], 50, 28, 20, 40)).toEqual({
      widths: [80, 90],
      indentPx: 40,
      appliedDeltaPx: 20,
    });
  });

  it("returns null when any column width is unknown", () => {
    expect(resizeFromLeftEdge([130, null], 20, 28, 0, Infinity)).toBeNull();
  });

  it("returns null for an empty table", () => {
    expect(resizeFromLeftEdge([], 20, 28, 0, Infinity)).toBeNull();
  });
});

describe("resizeColumnBoundary", () => {
  it("drag right grows the left column and shrinks the right (total fixed)", () => {
    expect(resizeColumnBoundary([100, 100, 100], 0, 30, 28)).toEqual([130, 70, 100]);
  });

  it("drag left shrinks the left column and grows the right", () => {
    expect(resizeColumnBoundary([100, 100, 100], 1, -20, 28)).toEqual([100, 80, 120]);
  });

  it("clamps so the shrinking column never goes below cellMinWidth", () => {
    expect(resizeColumnBoundary([100, 100], 0, 90, 28)).toEqual([172, 28]);
  });

  it("clamps the other direction too", () => {
    expect(resizeColumnBoundary([100, 100], 0, -90, 28)).toEqual([28, 172]);
  });

  it("returns null for an out-of-range boundary index", () => {
    expect(resizeColumnBoundary([100, 100], 1, 10, 28)).toBeNull();
    expect(resizeColumnBoundary([100, 100], -1, 10, 28)).toBeNull();
  });

  it("returns null when an affected column width is unknown", () => {
    expect(resizeColumnBoundary([100, null], 0, 10, 28)).toBeNull();
  });
});
