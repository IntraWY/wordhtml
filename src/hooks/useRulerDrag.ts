"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pxToMm, pxToCm } from "@/lib/page";
import {
  MIN_TAB_STOP_CM,
  MAX_TAB_STOP_CM,
  normalizeTabStops,
} from "@/lib/tiptap/paragraphFormat";

export interface DragState {
  type:
    | "left"
    | "first"
    | "right"
    | "marginLeft"
    | "marginRight"
    | "marginTop"
    | "marginBottom"
    | "tabStop";
  startX: number;
  startY: number;
  startLeft: number;
  startFirst: number;
  startRight: number;
  startMarginLeftMm: number;
  startMarginRightMm: number;
  startMarginTopMm: number;
  startMarginBottomMm: number;
  /** Index into `tabStops` being dragged (tabStop drags only). */
  tabStopIndex: number;
  /** Snapshot of the tab-stop list (cm) at drag start (tabStop drags only). */
  startTabStops: number[];
  /** Value (cm) of the stop being dragged at drag start — tracks identity, not index. */
  startTabValue: number;
  /** Live value (cm) of the dragged stop during the drag (tabStop drags only). */
  activeTabValue: number;
  /** True once the remove threshold has been crossed — finalized on drag END only. */
  tabPendingRemove: boolean;
}

export type DragType = DragState["type"];

interface TooltipState {
  x: number;
  y: number;
  text: string;
}

// ── Constants ───────────────────────────────────────────────────────────────
const SNAP_MARGIN_STEP = 5; // mm
const SNAP_INDENT_STEP = 0.5; // cm
const KEYBOARD_INDENT_STEP = 0.25; // cm per arrow key press
const KEYBOARD_INDENT_FINE_STEP = 0.05; // cm per arrow key press with Shift
const KEYBOARD_MARGIN_STEP = 1; // mm per arrow key press
const MIN_CONTENT_MM = 20;
// Minimum text column (cm) kept between left and right paragraph indents so the
// two indent markers can never cross / collapse the writing area to nothing.
const MIN_INDENT_CONTENT_CM = 1;
const TOOLTIP_OFFSET_Y = 16; // px below cursor

// Custom ruler tab stops
export const TAB_STOP_SNAP_CM = 0.25; // grid tab markers snap to
/** Vertical drag distance (px) past the ruler before a tab stop is dropped
 *  (Word: drag a tab off the ruler to delete it). */
export const TAB_STOP_REMOVE_THRESHOLD_PX = 20;

const snapMargin = (v: number) => Math.round(v / SNAP_MARGIN_STEP) * SNAP_MARGIN_STEP;
const snapIndent = (v: number) => Math.round(v / SNAP_INDENT_STEP) * SNAP_INDENT_STEP;

export const snapTabStop = (cm: number) =>
  Math.round(cm / TAB_STOP_SNAP_CM) * TAB_STOP_SNAP_CM;

export function makeTooltipText(type: DragType, value: number): string {
  switch (type) {
    case "marginLeft":
      return "ขอบซ้าย (Left): " + value.toFixed(1) + " มม.";
    case "marginRight":
      return "ขอบขวา (Right): " + value.toFixed(1) + " มม.";
    case "marginTop":
      return "ขอบบน (Top): " + value.toFixed(1) + " มม.";
    case "marginBottom":
      return "ขอบล่าง (Bottom): " + value.toFixed(1) + " มม.";
    case "left":
      return "ย่อหน้าซ้าย (Left indent): " + value.toFixed(1) + " ซม.";
    case "first":
      return "ย่อหน้าแรก (First line): " + value.toFixed(1) + " ซม.";
    case "right":
      return "ย่อหน้าขวา (Right indent): " + value.toFixed(1) + " ซม.";
    case "tabStop":
      return "แท็บ (Tab stop): " + value.toFixed(2) + " ซม.";
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

function clampMargin(
  value: number,
  otherMargin: number,
  pageSize: number,
  minContent = MIN_CONTENT_MM
): number {
  return clamp(value, 0, pageSize - otherMargin - minContent);
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Build the live list during a tab-stop drag, tracking the dragged stop by
 * IDENTITY (its `startValue`) rather than array index. The dragged stop is
 * carried as a distinct value (`activeValue`); the *other* stops are emitted
 * unchanged and never sorted/deduped mid-drag, so crossing a neighbor can't
 * collapse the dragged stop onto it and delete it. Normalization (sort/dedupe)
 * happens exactly once on drag END via `normalizeTabStops`.
 */
function liveTabStops(
  stops: number[],
  startValue: number,
  activeValue: number
): number[] {
  const active = round2(clamp(activeValue, MIN_TAB_STOP_CM, MAX_TAB_STOP_CM));
  // Drop only the FIRST occurrence of the dragged stop's start value (identity),
  // keeping any same-valued neighbor intact, then append the live active value.
  let dropped = false;
  const rest = stops.filter((v) => {
    if (!dropped && v === startValue) {
      dropped = true;
      return false;
    }
    return true;
  });
  return [...rest, active];
}

/** The list with the dragged stop (by identity) removed entirely. */
function withTabStopRemoved(stops: number[], startValue: number): number[] {
  let dropped = false;
  return stops.filter((v) => {
    if (!dropped && v === startValue) {
      dropped = true;
      return false;
    }
    return true;
  });
}

// ── Hook ────────────────────────────────────────────────────────────────────
interface UseRulerDragOptions {
  maxIndentCm: number;
  pageWidthMm: number;
  pageHeightMm: number;
  minContentMm: number;
  indentLeft: number;
  indentFirst: number;
  /** Current right paragraph indent (cm) on the active block. */
  indentRight?: number;
  marginLeftMm: number;
  marginRightMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  /** Current tab stops (cm) on the active block — left-edge relative. */
  tabStops?: number[];
  onIndentChange?: (marginLeft: number, textIndent: number) => void;
  onIndentRightChange?: (marginRight: number) => void;
  onMarginChange?: (aMm: number, bMm: number) => void;
  onTabStopsChange?: (stops: number[]) => void;
  onRulerActive?: (info: { label: string } | null) => void;
}

export function useRulerDrag({
  maxIndentCm,
  pageWidthMm,
  pageHeightMm,
  minContentMm,
  indentLeft,
  indentFirst,
  indentRight,
  marginLeftMm,
  marginRightMm,
  marginTopMm,
  marginBottomMm,
  tabStops,
  onIndentChange,
  onIndentRightChange,
  onMarginChange,
  onTabStopsChange,
  onRulerActive,
}: UseRulerDragOptions) {
  const dragRef = useRef<DragState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const anyInteractive =
    !!onIndentChange ||
    !!onIndentRightChange ||
    !!onMarginChange ||
    !!onTabStopsChange;

  // Stabilize mutable values with refs so callbacks can have empty deps
  const optsRef = useRef<UseRulerDragOptions>({
    maxIndentCm,
    pageWidthMm,
    pageHeightMm,
    minContentMm,
    indentLeft,
    indentFirst,
    indentRight,
    marginLeftMm,
    marginRightMm,
    marginTopMm,
    marginBottomMm,
    tabStops,
    onIndentChange,
    onIndentRightChange,
    onMarginChange,
    onTabStopsChange,
    onRulerActive,
  });

  // Update ref in an effect to avoid mutating during render.
  // Intentionally omit deps: we need the ref fresh on every render
  // so callbacks reading optsRef.current see latest values.
  useEffect(() => {
    optsRef.current = {
      maxIndentCm,
      pageWidthMm,
      pageHeightMm,
      minContentMm,
      indentLeft,
      indentFirst,
      indentRight,
      marginLeftMm,
      marginRightMm,
      marginTopMm,
      marginBottomMm,
      tabStops,
      onIndentChange,
      onIndentRightChange,
      onMarginChange,
      onTabStopsChange,
      onRulerActive,
    };
  });

  const startDrag = useCallback(
    (type: DragType, tabStopIndex = -1) =>
      (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
        const o = optsRef.current;
        const startTabStops = (o.tabStops ?? []).slice();
        const startTabValue =
          tabStopIndex >= 0 ? startTabStops[tabStopIndex] ?? 0 : 0;
        dragRef.current = {
          type,
          startX: clientX,
          startY: clientY,
          startLeft: o.indentLeft,
          startFirst: o.indentFirst,
          startRight: o.indentRight ?? 0,
          startMarginLeftMm: o.marginLeftMm,
          startMarginRightMm: o.marginRightMm,
          startMarginTopMm: o.marginTopMm,
          startMarginBottomMm: o.marginBottomMm,
          tabStopIndex,
          startTabStops,
          startTabValue,
          activeTabValue: startTabValue,
          tabPendingRemove: false,
        };
      },
    []
  );

  const handleKeyDown = useCallback((type: DragType) => (e: React.KeyboardEvent) => {
    const o = optsRef.current;
    const isVerticalMargin = type === "marginTop" || type === "marginBottom";
    const isIndent = type === "left" || type === "first" || type === "right";

    if (isVerticalMargin) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    } else if (isIndent || type.startsWith("margin")) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    }

    e.preventDefault();

    if (type === "right") {
      if (!o.onIndentRightChange) return;
      const step = e.shiftKey ? KEYBOARD_INDENT_FINE_STEP : KEYBOARD_INDENT_STEP;
      // ArrowLeft drags the right marker inward → MORE right indent; ArrowRight → less.
      const delta = e.key === "ArrowLeft" ? step : -step;
      const maxRight = Math.max(0, o.maxIndentCm - o.indentLeft - MIN_INDENT_CONTENT_CM);
      const newRight = round2(clamp((o.indentRight ?? 0) + delta, 0, maxRight));
      o.onIndentRightChange(newRight);
      o.onRulerActive?.({ label: makeTooltipText("right", newRight) });
      return;
    }

    if (type === "left" || type === "first") {
      if (!o.onIndentChange) return;
      const step = e.shiftKey ? KEYBOARD_INDENT_FINE_STEP : KEYBOARD_INDENT_STEP;
      const delta = e.key === "ArrowRight" ? step : -step;
      // Round to 2 decimals to avoid floating-point drift (e.g. 0.30000000000000004)
      const round2 = (v: number) => Math.round(v * 100) / 100;
      if (type === "left") {
        const newLeft = round2(clamp(o.indentLeft + delta, 0, o.maxIndentCm));
        o.onIndentChange(newLeft, o.indentFirst);
        o.onRulerActive?.({ label: makeTooltipText("left", newLeft) });
      } else {
        const newFirst = round2(o.indentFirst + delta);
        o.onIndentChange(o.indentLeft, newFirst);
        o.onRulerActive?.({ label: makeTooltipText("first", newFirst) });
      }
      return;
    }

    if (!o.onMarginChange) return;
    const delta = (() => {
      if (type === "marginLeft") return e.key === "ArrowRight" ? KEYBOARD_MARGIN_STEP : -KEYBOARD_MARGIN_STEP;
      if (type === "marginRight") return e.key === "ArrowLeft" ? KEYBOARD_MARGIN_STEP : -KEYBOARD_MARGIN_STEP;
      return e.key === "ArrowDown" ? KEYBOARD_MARGIN_STEP : -KEYBOARD_MARGIN_STEP;
    })();

    if (type === "marginLeft") {
      const newLeft = clampMargin(o.marginLeftMm + delta, o.marginRightMm, o.pageWidthMm, o.minContentMm);
      o.onMarginChange(newLeft, o.marginRightMm);
      o.onRulerActive?.({ label: makeTooltipText("marginLeft", newLeft) });
    } else if (type === "marginRight") {
      const newRight = clampMargin(o.marginRightMm + delta, o.marginLeftMm, o.pageWidthMm, o.minContentMm);
      o.onMarginChange(o.marginLeftMm, newRight);
      o.onRulerActive?.({ label: makeTooltipText("marginRight", newRight) });
    } else if (type === "marginTop") {
      const newTop = clampMargin(o.marginTopMm + delta, o.marginBottomMm, o.pageHeightMm, o.minContentMm);
      o.onMarginChange(newTop, o.marginBottomMm);
      o.onRulerActive?.({ label: makeTooltipText("marginTop", newTop) });
    } else if (type === "marginBottom") {
      const newBottom = clampMargin(o.marginBottomMm + delta, o.marginTopMm, o.pageHeightMm, o.minContentMm);
      o.onMarginChange(o.marginTopMm, newBottom);
      o.onRulerActive?.({ label: makeTooltipText("marginBottom", newBottom) });
    }
  }, []);

  // Global drag listeners
  useEffect(() => {
    if (!anyInteractive) return;

    let rafId = 0;
    let pendingMove: { clientX: number; clientY: number; shiftKey: boolean } | null = null;

    const computeMove = (
      drag: DragState,
      clientX: number,
      clientY: number,
      shiftKey: boolean
    ): TooltipState | null => {
      const o = optsRef.current;
      switch (drag.type) {
        case "left": {
          if (!o.onIndentChange) return null;
          const dx = clientX - drag.startX;
          let newLeft = clamp(drag.startLeft + pxToCm(dx), 0, o.maxIndentCm);
          if (!shiftKey) newLeft = snapIndent(newLeft);
          o.onIndentChange(newLeft, drag.startFirst);
          return { x: clientX, y: clientY + TOOLTIP_OFFSET_Y, text: makeTooltipText("left", newLeft) };
        }
        case "first": {
          if (!o.onIndentChange) return null;
          const dx = clientX - drag.startX;
          let newFirst = drag.startFirst + pxToCm(dx);
          if (!shiftKey) newFirst = snapIndent(newFirst);
          o.onIndentChange(drag.startLeft, newFirst);
          return { x: clientX, y: clientY + TOOLTIP_OFFSET_Y, text: makeTooltipText("first", newFirst) };
        }
        case "right": {
          if (!o.onIndentRightChange) return null;
          const dx = clientX - drag.startX;
          // Dragging the right marker LEFT (negative dx) increases the right indent.
          const maxRight = Math.max(0, o.maxIndentCm - o.indentLeft - MIN_INDENT_CONTENT_CM);
          let newRight = clamp(drag.startRight - pxToCm(dx), 0, maxRight);
          if (!shiftKey) newRight = snapIndent(newRight);
          newRight = round2(clamp(newRight, 0, maxRight));
          o.onIndentRightChange(newRight);
          return { x: clientX, y: clientY + TOOLTIP_OFFSET_Y, text: makeTooltipText("right", newRight) };
        }
        case "marginLeft": {
          if (!o.onMarginChange) return null;
          const dx = clientX - drag.startX;
          let newLeft = clampMargin(
            drag.startMarginLeftMm + pxToMm(dx),
            drag.startMarginRightMm,
            o.pageWidthMm,
            o.minContentMm
          );
          if (!shiftKey) newLeft = snapMargin(newLeft);
          o.onMarginChange(newLeft, drag.startMarginRightMm);
          return { x: clientX, y: clientY + TOOLTIP_OFFSET_Y, text: makeTooltipText("marginLeft", newLeft) };
        }
        case "marginRight": {
          if (!o.onMarginChange) return null;
          const dx = clientX - drag.startX;
          let newRight = clampMargin(
            drag.startMarginRightMm - pxToMm(dx),
            drag.startMarginLeftMm,
            o.pageWidthMm,
            o.minContentMm
          );
          if (!shiftKey) newRight = snapMargin(newRight);
          o.onMarginChange(drag.startMarginLeftMm, newRight);
          return { x: clientX, y: clientY + TOOLTIP_OFFSET_Y, text: makeTooltipText("marginRight", newRight) };
        }
        case "marginTop": {
          if (!o.onMarginChange) return null;
          const dy = clientY - drag.startY;
          let newTop = clampMargin(
            drag.startMarginTopMm + pxToMm(dy),
            drag.startMarginBottomMm,
            o.pageHeightMm,
            o.minContentMm
          );
          if (!shiftKey) newTop = snapMargin(newTop);
          o.onMarginChange(newTop, drag.startMarginBottomMm);
          return { x: clientX, y: clientY + TOOLTIP_OFFSET_Y, text: makeTooltipText("marginTop", newTop) };
        }
        case "marginBottom": {
          if (!o.onMarginChange) return null;
          const dy = clientY - drag.startY;
          let newBottom = clampMargin(
            drag.startMarginBottomMm - pxToMm(dy),
            drag.startMarginTopMm,
            o.pageHeightMm,
            o.minContentMm
          );
          if (!shiftKey) newBottom = snapMargin(newBottom);
          o.onMarginChange(drag.startMarginTopMm, newBottom);
          return { x: clientX, y: clientY + TOOLTIP_OFFSET_Y, text: makeTooltipText("marginBottom", newBottom) };
        }
        case "tabStop": {
          if (!o.onTabStopsChange) return null;
          const stops = drag.startTabStops;
          const startValue = drag.startTabValue;
          if (drag.tabStopIndex < 0 || stops[drag.tabStopIndex] == null) return null;

          // Recompute the live horizontal value regardless, so a release back
          // ON the ruler always lands at the cursor's current position.
          const dx = clientX - drag.startX;
          let value = startValue + pxToCm(dx);
          if (!shiftKey) value = snapTabStop(value);
          value = round2(clamp(value, MIN_TAB_STOP_CM, MAX_TAB_STOP_CM));
          drag.activeTabValue = value;

          // Off-ruler: mark "will remove" (Word behaviour) but DON'T commit the
          // delete — only on drag END. Show a live preview with the stop gone.
          const offRuler =
            Math.abs(clientY - drag.startY) > TAB_STOP_REMOVE_THRESHOLD_PX;
          drag.tabPendingRemove = offRuler;
          if (offRuler) {
            o.onTabStopsChange(withTabStopRemoved(stops, startValue));
            return {
              x: clientX,
              y: clientY + TOOLTIP_OFFSET_Y,
              text: "ลบแท็บ (Remove tab stop)",
            };
          }

          // On-ruler: emit the live list with the dragged stop carried by
          // identity (un-normalized) so crossing a neighbor never deletes it.
          o.onTabStopsChange(liveTabStops(stops, startValue, value));
          return {
            x: clientX,
            y: clientY + TOOLTIP_OFFSET_Y,
            text: makeTooltipText("tabStop", value),
          };
        }
      }
    };

    const flushMove = () => {
      rafId = 0;
      if (!pendingMove) return;
      const { clientX, clientY, shiftKey } = pendingMove;
      pendingMove = null;
      const drag = dragRef.current;
      if (!drag) return;
      const newTooltip = computeMove(drag, clientX, clientY, shiftKey);
      if (newTooltip) {
        setTooltip(newTooltip);
        optsRef.current.onRulerActive?.({ label: newTooltip.text });
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      pendingMove = { clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey };
      if (!rafId) rafId = requestAnimationFrame(flushMove);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      pendingMove = { clientX: t.clientX, clientY: t.clientY, shiftKey: false };
      if (!rafId) rafId = requestAnimationFrame(flushMove);
    };

    const endDrag = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      pendingMove = null;

      // Finalize tab-stop drags: normalize (sort/dedupe) exactly once on release.
      // Removal is committed here, not mid-drag, so it stays reversible — if the
      // user dragged back onto the ruler before letting go, the stop is kept at
      // its current position instead.
      const drag = dragRef.current;
      if (drag?.type === "tabStop") {
        const o = optsRef.current;
        if (o.onTabStopsChange) {
          const finalStops = drag.tabPendingRemove
            ? withTabStopRemoved(drag.startTabStops, drag.startTabValue)
            : liveTabStops(
                drag.startTabStops,
                drag.startTabValue,
                drag.activeTabValue
              );
          o.onTabStopsChange(normalizeTabStops(finalStops));
        }
      }

      dragRef.current = null;
      setTooltip(null);
      optsRef.current.onRulerActive?.(null);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", endDrag);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", endDrag);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", endDrag);
    };
  }, [anyInteractive]);

  return {
    dragRef,
    tooltip,
    startDrag,
    handleKeyDown,
  };
}
