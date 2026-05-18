"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PX_PER_CM } from "@/lib/page";

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

const snapMargin = (v: number) => Math.round(v / 5) * 5;
const snapIndent = (v: number) => Math.round(v / 0.5) * 0.5;

export function makeTooltipText(type: DragType, value: number): string {
  switch (type) {
    case "marginLeft":
      return String("ขอบซ้าย (Left): ") + value.toFixed(1) + " มม.";
    case "marginRight":
      return String("ขอบขวา (Right): ") + value.toFixed(1) + " มม.";
    case "marginTop":
      return String("ขอบบน (Top): ") + value.toFixed(1) + " มม.";
    case "marginBottom":
      return String("ขอบล่าง (Bottom): ") + value.toFixed(1) + " มม.";
    case "left":
      return String("ย่อหน้าซ้าย (Left indent): ") + value.toFixed(1) + " ซม.";
    case "first":
      return String("ย่อหน้าแรก (First line): ") + value.toFixed(1) + " ซม.";
  }
}

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

  const startDrag = useCallback(
    (type: DragType) => (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      dragRef.current = {
        type,
        startX: clientX,
        startY: clientY,
        startLeft: indentLeft,
        startFirst: indentFirst,
        startMarginLeftMm: marginLeftMm,
        startMarginRightMm: marginRightMm,
        startMarginTopMm: marginTopMm,
        startMarginBottomMm: marginBottomMm,
      };
    },
    [indentLeft, indentFirst, marginLeftMm, marginRightMm, marginTopMm, marginBottomMm]
  );

  const handleKeyDown = useCallback(
    (type: DragType) => (e: React.KeyboardEvent) => {
      const isVerticalMargin = type === "marginTop" || type === "marginBottom";
      const isIndent = type === "left" || type === "first";

      if (isVerticalMargin) {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      } else if (isIndent || type.startsWith("margin")) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      }

      e.preventDefault();

      if (isIndent) {
        if (!onIndentChange) return;
        const step = 0.1; // 0.1 cm per arrow key press
        const delta = e.key === "ArrowRight" ? step : -step;
        if (type === "left") {
          const newLeft = Math.max(0, Math.min(maxIndentCm, indentLeft + delta));
          onIndentChange(newLeft, indentFirst);
          onRulerActive?.({ label: makeTooltipText("left", newLeft) });
        } else {
          const newFirst = indentFirst + delta;
          onIndentChange(indentLeft, newFirst);
          onRulerActive?.({ label: makeTooltipText("first", newFirst) });
        }
        return;
      }

      if (!onMarginChange) return;
      const step = 1; // 1 mm per arrow key press

      const delta = (() => {
        if (type === "marginLeft") return e.key === "ArrowRight" ? step : -step;
        if (type === "marginRight") return e.key === "ArrowLeft" ? step : -step;
        return e.key === "ArrowDown" ? step : -step;
      })();

      if (type === "marginLeft") {
        const newLeft = Math.max(
          0,
          Math.min(pageWidthMm - marginRightMm - minContentMm, marginLeftMm + delta)
        );
        onMarginChange(newLeft, marginRightMm);
        onRulerActive?.({ label: makeTooltipText("marginLeft", newLeft) });
      } else if (type === "marginRight") {
        const newRight = Math.max(
          0,
          Math.min(pageWidthMm - marginLeftMm - minContentMm, marginRightMm + delta)
        );
        onMarginChange(marginLeftMm, newRight);
        onRulerActive?.({ label: makeTooltipText("marginRight", newRight) });
      } else if (type === "marginTop") {
        const newTop = Math.max(
          0,
          Math.min(pageHeightMm - marginBottomMm - minContentMm, marginTopMm + delta)
        );
        onMarginChange(newTop, marginBottomMm);
        onRulerActive?.({ label: makeTooltipText("marginTop", newTop) });
      } else if (type === "marginBottom") {
        const newBottom = Math.max(
          0,
          Math.min(pageHeightMm - marginTopMm - minContentMm, marginBottomMm + delta)
        );
        onMarginChange(marginTopMm, newBottom);
        onRulerActive?.({ label: makeTooltipText("marginBottom", newBottom) });
      }
    },
    [
      onIndentChange,
      onMarginChange,
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
      onRulerActive,
    ]
  );
  useEffect(() => {
    if (!anyInteractive) return;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
    const pxToMm = (px: number) => (px / PX_PER_CM) * 10;

    const computeMove = (
      drag: DragState,
      clientX: number,
      clientY: number,
      shiftKey: boolean
    ): TooltipState | null => {
      switch (drag.type) {
        case "left": {
          if (!onIndentChange) return null;
          const dx = clientX - drag.startX;
          let newLeft = clamp(drag.startLeft + pxToMm(dx) / 10, 0, maxIndentCm);
          if (!shiftKey) newLeft = snapIndent(newLeft);
          onIndentChange(newLeft, drag.startFirst);
          return { x: clientX, y: clientY + 16, text: makeTooltipText("left", newLeft) };
        }
        case "first": {
          if (!onIndentChange) return null;
          const dx = clientX - drag.startX;
          let newFirst = drag.startFirst + pxToMm(dx) / 10;
          if (!shiftKey) newFirst = snapIndent(newFirst);
          onIndentChange(drag.startLeft, newFirst);
          return { x: clientX, y: clientY + 16, text: makeTooltipText("first", newFirst) };
        }
        case "marginLeft": {
          if (!onMarginChange) return null;
          const dx = clientX - drag.startX;
          let newLeft = clamp(
            drag.startMarginLeftMm + pxToMm(dx),
            0,
            pageWidthMm - drag.startMarginRightMm - minContentMm
          );
          if (!shiftKey) newLeft = snapMargin(newLeft);
          onMarginChange(newLeft, drag.startMarginRightMm);
          return { x: clientX, y: clientY + 16, text: makeTooltipText("marginLeft", newLeft) };
        }
        case "marginRight": {
          if (!onMarginChange) return null;
          const dx = clientX - drag.startX;
          let newRight = clamp(
            drag.startMarginRightMm - pxToMm(dx),
            0,
            pageWidthMm - drag.startMarginLeftMm - minContentMm
          );
          if (!shiftKey) newRight = snapMargin(newRight);
          onMarginChange(drag.startMarginLeftMm, newRight);
          return { x: clientX, y: clientY + 16, text: makeTooltipText("marginRight", newRight) };
        }
        case "marginTop": {
          if (!onMarginChange) return null;
          const dy = clientY - drag.startY;
          let newTop = clamp(
            drag.startMarginTopMm + pxToMm(dy),
            0,
            pageHeightMm - drag.startMarginBottomMm - minContentMm
          );
          if (!shiftKey) newTop = snapMargin(newTop);
          onMarginChange(newTop, drag.startMarginBottomMm);
          return { x: clientX, y: clientY + 16, text: makeTooltipText("marginTop", newTop) };
        }
        case "marginBottom": {
          if (!onMarginChange) return null;
          const dy = clientY - drag.startY;
          let newBottom = clamp(
            drag.startMarginBottomMm + pxToMm(dy),
            0,
            pageHeightMm - drag.startMarginTopMm - minContentMm
          );
          if (!shiftKey) newBottom = snapMargin(newBottom);
          onMarginChange(drag.startMarginTopMm, newBottom);
          return { x: clientX, y: clientY + 16, text: makeTooltipText("marginBottom", newBottom) };
        }
      }
    };

    const processMove = (clientX: number, clientY: number, shiftKey: boolean) => {
      const drag = dragRef.current;
      if (!drag) return;
      const newTooltip = computeMove(drag, clientX, clientY, shiftKey);
      if (newTooltip) {
        setTooltip(newTooltip);
        onRulerActive?.({ label: newTooltip.text });
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      processMove(e.clientX, e.clientY, e.shiftKey);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) processMove(t.clientX, t.clientY, false);
    };

    const endDrag = () => {
      dragRef.current = null;
      setTooltip(null);
      onRulerActive?.(null);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", endDrag);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", endDrag);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", endDrag);
    };
  }, [
    anyInteractive,
    onIndentChange,
    onMarginChange,
    maxIndentCm,
    pageWidthMm,
    pageHeightMm,
    minContentMm,
    onRulerActive,
  ]);

  return {
    dragRef,
    tooltip,
    setTooltip,
    startDrag,
    handleKeyDown,
  };
}
