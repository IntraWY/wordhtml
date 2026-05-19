"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pxToMm, pxToCm } from "@/lib/page";

export interface DragState {
  type: "left" | "first" | "marginLeft" | "marginRight" | "marginTop" | "marginBottom";
  startX: number;
  startY: number;
  startLeft: number;
  startFirst: number;
  startMarginLeftMm: number;
  startMarginRightMm: number;
  startMarginTopMm: number;
  startMarginBottomMm: number;
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
const KEYBOARD_INDENT_STEP = 0.1; // cm per arrow key press
const KEYBOARD_MARGIN_STEP = 1; // mm per arrow key press
const MIN_CONTENT_MM = 20;
const TOOLTIP_OFFSET_Y = 16; // px below cursor

const snapMargin = (v: number) => Math.round(v / SNAP_MARGIN_STEP) * SNAP_MARGIN_STEP;
const snapIndent = (v: number) => Math.round(v / SNAP_INDENT_STEP) * SNAP_INDENT_STEP;

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

// ── Hook ────────────────────────────────────────────────────────────────────
interface UseRulerDragOptions {
  maxIndentCm: number;
  pageWidthMm: number;
  pageHeightMm: number;
  minContentMm: number;
  indentLeft: number;
  indentFirst: number;
  marginLeftMm: number;
  marginRightMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  onIndentChange?: (marginLeft: number, textIndent: number) => void;
  onMarginChange?: (aMm: number, bMm: number) => void;
  onRulerActive?: (info: { label: string } | null) => void;
}

export function useRulerDrag({
  maxIndentCm,
  pageWidthMm,
  pageHeightMm,
  minContentMm,
  indentLeft,
  indentFirst,
  marginLeftMm,
  marginRightMm,
  marginTopMm,
  marginBottomMm,
  onIndentChange,
  onMarginChange,
  onRulerActive,
}: UseRulerDragOptions) {
  const dragRef = useRef<DragState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const anyInteractive = !!onIndentChange || !!onMarginChange;

  // Stabilize mutable values with refs so callbacks can have empty deps
  const optsRef = useRef<UseRulerDragOptions>({
    maxIndentCm,
    pageWidthMm,
    pageHeightMm,
    minContentMm,
    indentLeft,
    indentFirst,
    marginLeftMm,
    marginRightMm,
    marginTopMm,
    marginBottomMm,
    onIndentChange,
    onMarginChange,
    onRulerActive,
  });

  // Update ref in an effect to avoid mutating during render.
  // Intentionally omit deps: we need the ref fresh on every render
  // so callbacks reading optsRef.current see latest values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    optsRef.current = {
      maxIndentCm,
      pageWidthMm,
      pageHeightMm,
      minContentMm,
      indentLeft,
      indentFirst,
      marginLeftMm,
      marginRightMm,
      marginTopMm,
      marginBottomMm,
      onIndentChange,
      onMarginChange,
      onRulerActive,
    };
  });

  const startDrag = useCallback((type: DragType) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const o = optsRef.current;
    dragRef.current = {
      type,
      startX: clientX,
      startY: clientY,
      startLeft: o.indentLeft,
      startFirst: o.indentFirst,
      startMarginLeftMm: o.marginLeftMm,
      startMarginRightMm: o.marginRightMm,
      startMarginTopMm: o.marginTopMm,
      startMarginBottomMm: o.marginBottomMm,
    };
  }, []);

  const handleKeyDown = useCallback((type: DragType) => (e: React.KeyboardEvent) => {
    const o = optsRef.current;
    const isVerticalMargin = type === "marginTop" || type === "marginBottom";
    const isIndent = type === "left" || type === "first";

    if (isVerticalMargin) {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    } else if (isIndent || type.startsWith("margin")) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    }

    e.preventDefault();

    if (isIndent) {
      if (!o.onIndentChange) return;
      const delta = e.key === "ArrowRight" ? KEYBOARD_INDENT_STEP : -KEYBOARD_INDENT_STEP;
      if (type === "left") {
        const newLeft = clamp(o.indentLeft + delta, 0, o.maxIndentCm);
        o.onIndentChange(newLeft, o.indentFirst);
        o.onRulerActive?.({ label: makeTooltipText("left", newLeft) });
      } else {
        const newFirst = o.indentFirst + delta;
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
