import { PX_PER_CM } from "@/lib/page";

// ── Per-position tab-stop layout math (pure, unit-tested) ────────────────────
//
// Word-style tab stops: each `\t` advances to the NEXT stop whose position is
// greater than the tab's current x, and the text that FOLLOWS the tab is
// aligned to that stop by the stop's type (left/center/right/decimal). A `bar`
// stop only draws a vertical rule and does not consume a tab.
//
// These helpers work purely in pixels/cm so they can be unit-tested without a
// DOM. The ProseMirror plugin (tabStopPlugin.ts) and the export baker
// (lib/export/bakeTabStops.ts) measure real text widths and call into here.

export type TabType = "left" | "center" | "right" | "decimal" | "bar";

/** A single ruler tab stop: position in cm + alignment type. */
export interface TabStopSpec {
  pos: number; // cm, content-relative
  type: TabType;
}

/** Short glyph per tab type, shown in the ruler corner selector + on markers. */
export const TAB_TYPE_GLYPH: Record<TabType, string> = {
  left: "L",
  center: "C",
  right: "R",
  decimal: "D",
  bar: "|",
};

/** Thai-primary label per tab type for tooltips/aria. */
export const TAB_TYPE_LABEL: Record<TabType, string> = {
  left: "ซ้าย (Left)",
  center: "กลาง (Center)",
  right: "ขวา (Right)",
  decimal: "ทศนิยม (Decimal)",
  bar: "เส้น (Bar)",
};

/** px tolerance so a tab sitting exactly on a stop advances to the NEXT one. */
const EPS_PX = 0.5;

/** Minimum rendered width for a tab glyph so following text never overlaps backward. */
export const MIN_TAB_WIDTH_PX = 1;

export interface TabTarget {
  targetPx: number;
  type: TabType;
}

/**
 * The next advancing stop strictly to the right of `xpx` (content-relative px).
 * `bar` stops are skipped — they draw a line but do not stop a tab. When no
 * explicit stop remains, fall back to the next multiple of `defaultIntervalCm`
 * (the global 1.27cm grid), treated as a left stop. Returns null only when no
 * stops and no default grid are available.
 */
export function nextStop(
  xpx: number,
  stops: TabStopSpec[],
  defaultIntervalCm: number
): TabTarget | null {
  const advancing = stops
    .filter((s) => s.type !== "bar" && Number.isFinite(s.pos))
    .map((s) => ({ targetPx: s.pos * PX_PER_CM, type: s.type }))
    .sort((a, b) => a.targetPx - b.targetPx);

  for (const s of advancing) {
    if (s.targetPx > xpx + EPS_PX) return s;
  }

  if (defaultIntervalCm > 0) {
    const stepPx = defaultIntervalCm * PX_PER_CM;
    const n = Math.floor((xpx + EPS_PX) / stepPx) + 1;
    return { targetPx: n * stepPx, type: "left" };
  }
  return null;
}

/**
 * Rendered width (px) for a tab glyph so the run after it aligns to the target.
 * - left:    run starts at the stop
 * - center:  run is centered on the stop
 * - right:   run ends at the stop
 * - decimal: the decimal separator sits on the stop (prefix width = text up to it)
 * - bar:     treated as left for advancement (bars are drawn separately)
 */
export function computeTabWidth(
  tabStartXpx: number,
  target: TabTarget,
  followingRunWidthPx: number,
  decimalPrefixWidthPx: number,
  minWidthPx: number = MIN_TAB_WIDTH_PX
): number {
  const { targetPx, type } = target;
  let w: number;
  switch (type) {
    case "center":
      w = targetPx - followingRunWidthPx / 2 - tabStartXpx;
      break;
    case "right":
      w = targetPx - followingRunWidthPx - tabStartXpx;
      break;
    case "decimal":
      w = targetPx - decimalPrefixWidthPx - tabStartXpx;
      break;
    case "left":
    case "bar":
    default:
      w = targetPx - tabStartXpx;
      break;
  }
  return Math.max(minWidthPx, w);
}

/**
 * The substring of a run before its decimal separator (first `.`), used to
 * measure the prefix width for decimal tabs. With no separator, returns the
 * whole run so a decimal stop degrades to right-alignment (Word behaviour).
 */
export function decimalPrefix(run: string): string {
  const i = run.indexOf(".");
  return i >= 0 ? run.slice(0, i) : run;
}

/**
 * Pair a positions list with a (possibly shorter/legacy) types list, defaulting
 * missing entries to "left". Keeps the two parallel arrays index-aligned and
 * backward-compatible with documents that only have `data-tab-stops`.
 */
export function zipTabStops(
  positions: number[],
  types: TabType[] | undefined
): TabStopSpec[] {
  return positions.map((pos, i) => ({
    pos,
    type: (types && types[i]) || "left",
  }));
}

/**
 * Re-derive the alignment types for a NEW positions list given the OLD
 * positions+types. Stops are tracked by value identity so a drag (one position
 * changes), a reorder/dedupe (positions identical, order differs), an add, and a
 * remove all keep their types correctly:
 * - value still present  → keep its old type
 * - value moved          → the one "leftover" old type follows it
 * - genuinely new value  → `defaultType` (the current corner selection)
 *
 * This lives here (pure) so `useRulerDrag` can stay a plain `number[]` mover and
 * all the type bookkeeping is isolated to the IndentRuler/paragraphFormat path.
 */
export function remapTabStopTypes(
  oldStops: number[],
  oldTypes: TabType[],
  newStops: number[],
  defaultType: TabType
): TabType[] {
  const used = new Array(oldStops.length).fill(false);
  const matched: (TabType | null)[] = newStops.map((s) => {
    const idx = oldStops.findIndex((o, i) => !used[i] && o === s);
    if (idx >= 0) {
      used[idx] = true;
      return oldTypes[idx] ?? "left";
    }
    return null;
  });
  const leftover: TabType[] = [];
  oldStops.forEach((_, i) => {
    if (!used[i]) leftover.push(oldTypes[i] ?? "left");
  });
  let li = 0;
  return matched.map((t) =>
    t ?? (li < leftover.length ? leftover[li++] : defaultType)
  );
}
