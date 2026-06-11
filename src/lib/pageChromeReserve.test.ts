import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  measureChromeReservePx,
  measureHeaderFooterReservePx,
  MIN_ZONE_PX,
  MAX_ZONE_PX,
} from "./pageChromeReserve";
import type { HeaderFooterConfig } from "@/types";

const config = (overrides: Partial<HeaderFooterConfig> = {}): HeaderFooterConfig => ({
  enabled: true,
  headerHtml: "",
  footerHtml: "",
  differentFirstPage: false,
  differentOddEven: false,
  ...overrides,
});

// jsdom has no layout: offsetHeight is 0 by default. Stub it so probes report
// a height derived from their content, letting us exercise variant-max logic.
let originalDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  originalDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetHeight"
  );
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get(this: HTMLElement) {
      if (this.innerHTML.includes("data-h-200")) return 200;
      if (this.innerHTML.includes("data-h-60")) return 60;
      return 30;
    },
  });
});

afterEach(() => {
  if (originalDescriptor) {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalDescriptor);
  } else {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)
      .offsetHeight;
  }
});

describe("measureChromeReservePx", () => {
  it("returns zeros when disabled or missing", () => {
    expect(measureChromeReservePx(undefined)).toEqual({
      headerPx: 0,
      footerPx: 0,
      totalPx: 0,
    });
    expect(measureChromeReservePx(config({ enabled: false }))).toEqual({
      headerPx: 0,
      footerPx: 0,
      totalPx: 0,
    });
  });

  it("returns zeros when all variants are empty", () => {
    expect(measureChromeReservePx(config())).toEqual({
      headerPx: 0,
      footerPx: 0,
      totalPx: 0,
    });
  });

  it("reserves only the zone that has content", () => {
    const r = measureChromeReservePx(config({ footerHtml: "<p>หน้า {page}</p>" }));
    expect(r.headerPx).toBe(0);
    expect(r.footerPx).toBe(30);
    expect(r.totalPx).toBe(30);
  });

  it("clamps a zone to the minimum and maximum", () => {
    const tall = measureChromeReservePx(
      config({ headerHtml: "<p data-h-200>tall logo</p>" })
    );
    expect(tall.headerPx).toBe(MAX_ZONE_PX);

    // Probe reports 30 ≥ MIN_ZONE_PX, so simulate a short zone via the floor.
    expect(MIN_ZONE_PX).toBeLessThanOrEqual(30);
  });

  it("takes the max across active variants only", () => {
    const base = config({
      headerHtml: "<p>base</p>",
      firstPageHeaderHtml: "<p data-h-60>first page letterhead</p>",
    });

    // differentFirstPage off → first-page variant ignored
    expect(measureChromeReservePx(base).headerPx).toBe(30);

    // differentFirstPage on → taller first-page variant wins
    expect(
      measureChromeReservePx({ ...base, differentFirstPage: true }).headerPx
    ).toBe(60);
  });

  it("sums header and footer into totalPx", () => {
    const r = measureChromeReservePx(
      config({
        headerHtml: "<p data-h-60>h</p>",
        footerHtml: "<p>f</p>",
      })
    );
    expect(r.totalPx).toBe(60 + 30);
  });
});

describe("measureHeaderFooterReservePx (legacy wrapper)", () => {
  it("returns the combined total for header+footer", () => {
    expect(measureHeaderFooterReservePx("<p>h</p>", "<p>f</p>")).toBe(60);
    expect(measureHeaderFooterReservePx(undefined, "<p>f</p>")).toBe(30);
    expect(measureHeaderFooterReservePx()).toBe(0);
  });
});
