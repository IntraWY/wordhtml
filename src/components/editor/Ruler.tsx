"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PX_PER_CM } from "@/lib/page";

interface RulerProps {
  orientation: "horizontal" | "vertical";
  cm: number;
  marginStart: number; // px from edge to content start
  marginEnd: number;   // px from edge to content end
  // Interactive indent handles (horizontal only, omit for visual-only ruler)
  indentLeft?: number;  // cm
  indentFirst?: number; // cm offset from indentLeft (can be negative)
  onIndentChange?: (marginLeft: number, textIndent: number) => void;
  // Margin handles (horizontal or vertical)
  marginLeftMm?: number;
  marginRightMm?: number;
  marginTopMm?: number;
  marginBottomMm?: number;
  onMarginChange?: (aMm: number, bMm: number) => void;
  // Actual content height in px (vertical only). When provided the ruler
  // extends to cover the full scrollable content, not just one page.
  contentHeight?: number;
  // Called when a handle is hovered or dragged; null when interaction ends.
  onRulerActive?: (info: { label: string } | null) => void;
}

interface Tick {
  pos: number;
  major: boolean;
  label: number | null;
}

function Tooltip({ tooltip }: { tooltip: { x: number; y: number; text: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ left: number; top: number }>({ left: tooltip.x + 12, top: tooltip.y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.min(tooltip.x + 12, window.innerWidth - rect.width - 8);
    const top = Math.min(tooltip.y, window.innerHeight - rect.height - 8);
    setStyle({ left, top });
  }, [tooltip.x, tooltip.y]);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed z-[300] rounded-md bg-[color:var(--color-foreground)] px-2 py-1 text-[11px] font-medium text-[color:var(--color-background)] shadow-lg"
      style={{ left: style.left, top: style.top }}
    >
      {tooltip.text}
    </div>
  );
}

interface DragState {
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

function RulerInner({
  orientation,
  cm,
  marginStart,
  marginEnd,
  indentLeft = 0,
  indentFirst = 0,
  onIndentChange,
  marginLeftMm = 0,
  marginRightMm = 0,
  marginTopMm = 0,
  marginBottomMm = 0,
  onMarginChange,
  contentHeight,
  onRulerActive,
}: RulerProps) {
  const isH = orientation === "horizontal";
  const totalPx = cm * PX_PER_CM;
  const rulerLengthPx = !isH && contentHeight ? contentHeight : totalPx;
  const indentInteractive = isH && !!onIndentChange;
  const marginInteractive = !!onMarginChange;
  const anyInteractive = indentInteractive || marginInteractive;

  const dragRef = useRef<DragState | null>(null);

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Generate tick positions — ensure we cover the full length, not just integer cm
  const ticks: Tick[] = useMemo(() => {
    const result: Tick[] = [];
    const maxPos = rulerLengthPx;
    let i = 0;
    while (i * PX_PER_CM <= maxPos + 0.001) {
      result.push({ pos: i * PX_PER_CM, major: true, label: i });
      if ((i + 0.5) * PX_PER_CM <= maxPos + 0.001) {
        result.push({ pos: (i + 0.5) * PX_PER_CM, major: false, label: null });
      }
      i++;
    }
    return result;
  }, [rulerLengthPx]);

  const marginGuideStart = marginStart;
  const marginGuideEnd = totalPx - marginEnd;

  // Pixel positions of indent handles
  const leftPx = marginStart + indentLeft * PX_PER_CM;
  const firstPx = marginStart + (indentLeft + indentFirst) * PX_PER_CM;

  const maxIndentCm = (totalPx - marginEnd - marginStart) / PX_PER_CM;
  const pageWidthMm = cm * 10;
  const pageHeightMm = cm * 10;
  const minContentMm = 20; // minimum 2cm content width/height

  const snapMargin = useCallback((v: number) => Math.round(v / 5) * 5, []);
  const snapIndent = useCallback((v: number) => Math.round(v / 0.5) * 0.5, []);

  const makeTooltipText = useCallback(
    (type: DragState["type"], value: number) => {
      switch (type) {
        case "marginLeft":
          return `ขอบซ้าย (Left): ${value.toFixed(1)} มม.`;
        case "marginRight":
          return `ขอบขวา (Right): ${value.toFixed(1)} มม.`;
        case "marginTop":
          return `ขอบบน (Top): ${value.toFixed(1)} มม.`;
        case "marginBottom":
          return `ขอบล่าง (Bottom): ${value.toFixed(1)} มม.`;
        case "left":
          return `ย่อหน้าซ้าย (Left indent): ${value.toFixed(1)} ซม.`;
        case "first":
          return `ย่อหน้าแรก (First line): ${value.toFixed(1)} ซม.`;
      }
    },
    []
  );

  useEffect(() => {
    if (!anyInteractive) return;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
    const pxToMm = (px: number) => (px / PX_PER_CM) * 10;

    const processMove = (clientX: number, clientY: number, shiftKey: boolean) => {
      const drag = dragRef.current;
      if (!drag) return;

      let newTooltip: { x: number; y: number; text: string } | null = null;

      if (drag.type === "left") {
        if (!onIndentChange) return;
        const dx = clientX - drag.startX;
        const dMm = pxToMm(dx);
        let newLeft = clamp(drag.startLeft + dMm / 10, 0, maxIndentCm);
        if (!shiftKey) newLeft = snapIndent(newLeft);
        onIndentChange(newLeft, drag.startFirst);
        newTooltip = { x: clientX, y: clientY + 16, text: makeTooltipText("left", newLeft) };
      } else if (drag.type === "first") {
        if (!onIndentChange) return;
        const dx = clientX - drag.startX;
        const dMm = pxToMm(dx);
        let newFirst = drag.startFirst + dMm / 10;
        if (!shiftKey) newFirst = snapIndent(newFirst);
        onIndentChange(drag.startLeft, newFirst);
        newTooltip = { x: clientX, y: clientY + 16, text: makeTooltipText("first", newFirst) };
      } else if (drag.type === "marginLeft") {
        if (!onMarginChange) return;
        const dx = clientX - drag.startX;
        const dMm = pxToMm(dx);
        let newLeft = clamp(
          drag.startMarginLeftMm + dMm,
          0,
          pageWidthMm - drag.startMarginRightMm - minContentMm
        );
        if (!shiftKey) newLeft = snapMargin(newLeft);
        onMarginChange(newLeft, drag.startMarginRightMm);
        newTooltip = { x: clientX, y: clientY + 16, text: makeTooltipText("marginLeft", newLeft) };
      } else if (drag.type === "marginRight") {
        if (!onMarginChange) return;
        const dx = clientX - drag.startX;
        const dMm = pxToMm(dx);
        let newRight = clamp(
          drag.startMarginRightMm - dMm,
          0,
          pageWidthMm - drag.startMarginLeftMm - minContentMm
        );
        if (!shiftKey) newRight = snapMargin(newRight);
        onMarginChange(drag.startMarginLeftMm, newRight);
        newTooltip = { x: clientX, y: clientY + 16, text: makeTooltipText("marginRight", newRight) };
      } else if (drag.type === "marginTop") {
        if (!onMarginChange) return;
        const dy = clientY - drag.startY;
        const dMm = pxToMm(dy);
        let newTop = clamp(
          drag.startMarginTopMm + dMm,
          0,
          pageHeightMm - drag.startMarginBottomMm - minContentMm
        );
        if (!shiftKey) newTop = snapMargin(newTop);
        onMarginChange(newTop, drag.startMarginBottomMm);
        newTooltip = { x: clientX, y: clientY + 16, text: makeTooltipText("marginTop", newTop) };
      } else if (drag.type === "marginBottom") {
        if (!onMarginChange) return;
        const dy = clientY - drag.startY;
        const dMm = pxToMm(dy);
        let newBottom = clamp(
          drag.startMarginBottomMm + dMm,
          0,
          pageHeightMm - drag.startMarginTopMm - minContentMm
        );
        if (!shiftKey) newBottom = snapMargin(newBottom);
        onMarginChange(drag.startMarginTopMm, newBottom);
        newTooltip = { x: clientX, y: clientY + 16, text: makeTooltipText("marginBottom", newBottom) };
      }

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

    const onMouseUp = () => {
      dragRef.current = null;
      setTooltip(null);
      onRulerActive?.(null);
    };

    const onTouchEnd = () => {
      dragRef.current = null;
      setTooltip(null);
      onRulerActive?.(null);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [anyInteractive, onIndentChange, onMarginChange, maxIndentCm, pageWidthMm, pageHeightMm, snapIndent, snapMargin, makeTooltipText, onRulerActive]);

  const startIndentDrag = useCallback(
    (type: "left" | "first") => (e: React.MouseEvent | React.TouchEvent) => {
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

  const startMarginDrag = useCallback(
    (type: "marginLeft" | "marginRight" | "marginTop" | "marginBottom") => (e: React.MouseEvent | React.TouchEvent) => {
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

  const handleMarginKeyDown =
    (type: "marginLeft" | "marginRight" | "marginTop" | "marginBottom") => (e: React.KeyboardEvent) => {
      const isVertical = type === "marginTop" || type === "marginBottom";
      if (isVertical) {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      } else {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      }
      e.preventDefault();
      if (!onMarginChange) return;
      const step = 1; // 1 mm per arrow key press

      if (type === "marginLeft") {
        const delta = e.key === "ArrowRight" ? step : -step;
        const newLeft = Math.max(
          0,
          Math.min(pageWidthMm - marginRightMm - minContentMm, marginLeftMm + delta)
        );
        onMarginChange(newLeft, marginRightMm);
        onRulerActive?.({ label: makeTooltipText("marginLeft", newLeft) });
      } else if (type === "marginRight") {
        const delta = e.key === "ArrowLeft" ? step : -step;
        const newRight = Math.max(
          0,
          Math.min(pageWidthMm - marginLeftMm - minContentMm, marginRightMm + delta)
        );
        onMarginChange(marginLeftMm, newRight);
        onRulerActive?.({ label: makeTooltipText("marginRight", newRight) });
      } else if (type === "marginTop") {
        const delta = e.key === "ArrowDown" ? step : -step;
        const newTop = Math.max(
          0,
          Math.min(pageHeightMm - marginBottomMm - minContentMm, marginTopMm + delta)
        );
        onMarginChange(newTop, marginBottomMm);
        onRulerActive?.({ label: makeTooltipText("marginTop", newTop) });
      } else if (type === "marginBottom") {
        const delta = e.key === "ArrowDown" ? step : -step;
        const newBottom = Math.max(
          0,
          Math.min(pageHeightMm - marginTopMm - minContentMm, marginBottomMm + delta)
        );
        onMarginChange(marginTopMm, newBottom);
        onRulerActive?.({ label: makeTooltipText("marginBottom", newBottom) });
      }
    };

  const handleIndentKeyDown =
    (type: "left" | "first") => (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      if (!onIndentChange) return;
      const step = 0.1; // 0.1 cm per arrow key press
      if (type === "left") {
        const delta = e.key === "ArrowRight" ? step : -step;
        const newLeft = Math.max(0, Math.min(maxIndentCm, indentLeft + delta));
        onIndentChange(newLeft, indentFirst);
        onRulerActive?.({ label: makeTooltipText("left", newLeft) });
      } else {
        const delta = e.key === "ArrowRight" ? step : -step;
        const newFirst = indentFirst + delta;
        onIndentChange(indentLeft, newFirst);
        onRulerActive?.({ label: makeTooltipText("first", newFirst) });
      }
    };

  // Hover state helpers
  const [hovered, setHovered] = useState<string | null>(null);

  const handleEnter = (id: string, label: string) => {
    setHovered(id);
    if (!dragRef.current) onRulerActive?.({ label });
  };

  const handleLeave = () => {
    setHovered(null);
    if (!dragRef.current) onRulerActive?.(null);
  };

  return (
    <div
      className={cn(
        "ruler",
        isH ? "ruler-h" : "ruler-v",
        "relative bg-[color:var(--color-muted)] select-none",
        "border-[color:var(--color-border)]",
        isH ? "h-[18px] border-b" : "w-[18px] border-r"
      )}
      style={{ [isH ? "width" : "height"]: `${rulerLengthPx}px` }}
    >
      {ticks.map((t, i) => (
        <div
          key={i}
          className={cn(
            "ruler-tick absolute",
            t.major
              ? "ruler-tick-major bg-[color:var(--color-foreground)]"
              : "ruler-tick-minor bg-[color:var(--color-border-strong)]",
            isH
              ? cn("bottom-0 w-px", t.major ? "h-2" : "h-1")
              : cn("right-0 h-px", t.major ? "w-2" : "w-1")
          )}
          style={{ [isH ? "left" : "top"]: `${t.pos}px` }}
        />
      ))}
      {ticks
        .filter((t) => t.label !== null && t.label > 0)
        .map((t, i) => (
          <span
            key={`label-${i}`}
            className={cn(
              "absolute text-[9px] font-mono text-[color:var(--color-muted-foreground)]",
              isH ? "top-0.5 -translate-x-1/2" : "left-0.5 -translate-y-1/2"
            )}
            style={
              isH
                ? { left: `${t.pos}px` }
                : { top: `${t.pos}px`, writingMode: "vertical-rl" as const }
            }
          >
            {t.label}
          </span>
        ))}

      {/* Margin guides */}
      <div
        className="absolute"
        style={{
          background: "oklch(70% 0.15 25 / 0.5)",
          ...(isH
            ? { left: `${marginGuideStart}px`, top: 0, bottom: 0, width: "1px" }
            : { top: `${marginGuideStart}px`, left: 0, right: 0, height: "1px" }),
        }}
      />
      {isH ? (
        <div
          className="absolute"
          style={{
            background: "oklch(70% 0.15 25 / 0.5)",
            left: `${marginGuideEnd}px`,
            top: 0,
            bottom: 0,
            width: "1px",
          }}
        />
      ) : (
        // For vertical ruler, render bottom margin guides at the end of every page
        Array.from({ length: Math.max(1, Math.ceil((contentHeight ?? totalPx) / totalPx)) }, (_, i) => (
          <div
            key={`margin-guide-end-${i}`}
            className="absolute"
            style={{
              background: "oklch(70% 0.15 25 / 0.5)",
              top: `${(i + 1) * totalPx - marginEnd}px`,
              left: 0,
              right: 0,
              height: "1px",
            }}
          />
        ))
      )}

      {/* Margin handles */}
      {marginInteractive && (
        <>
          {isH ? (
            <>
              {/* Left margin handle */}
              <div
                role="slider"
                tabIndex={0}
                aria-orientation="horizontal"
                aria-label={`ขอบซ้าย (Left margin) ${marginLeftMm.toFixed(1)} มม.`}
                aria-valuemin={0}
                aria-valuemax={pageWidthMm - marginRightMm - minContentMm}
                aria-valuenow={Math.round(marginLeftMm)}
                onMouseDown={startMarginDrag("marginLeft")}
                onTouchStart={startMarginDrag("marginLeft")}
                onKeyDown={handleMarginKeyDown("marginLeft")}
                onMouseEnter={() =>
                  handleEnter("marginLeft", `ขอบซ้าย (Left): ${marginLeftMm.toFixed(1)} มม.`)
                }
                onMouseLeave={handleLeave}
                className={cn(
                  "absolute grid cursor-ew-resize place-items-center",
                  hovered === "marginLeft" && "z-20"
                )}
                style={{
                  left: `${marginGuideStart}px`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "20px",
                  height: "20px",
                }}
              >
                <div
                  className={cn(
                    "rounded-sm transition-all duration-150",
                    hovered === "marginLeft"
                      ? "scale-125 bg-gray-800 shadow-md"
                      : "bg-gray-600 hover:scale-[1.15] hover:bg-gray-700"
                  )}
                  style={{ width: "8px", height: "14px" }}
                />
              </div>
              {/* Right margin handle */}
              <div
                role="slider"
                tabIndex={0}
                aria-orientation="horizontal"
                aria-label={`ขอบขวา (Right margin) ${marginRightMm.toFixed(1)} มม.`}
                aria-valuemin={0}
                aria-valuemax={pageWidthMm - marginLeftMm - minContentMm}
                aria-valuenow={Math.round(marginRightMm)}
                onMouseDown={startMarginDrag("marginRight")}
                onTouchStart={startMarginDrag("marginRight")}
                onKeyDown={handleMarginKeyDown("marginRight")}
                onMouseEnter={() =>
                  handleEnter("marginRight", `ขอบขวา (Right): ${marginRightMm.toFixed(1)} มม.`)
                }
                onMouseLeave={handleLeave}
                className={cn(
                  "absolute grid cursor-ew-resize place-items-center",
                  hovered === "marginRight" && "z-20"
                )}
                style={{
                  left: `${marginGuideEnd}px`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "20px",
                  height: "20px",
                }}
              >
                <div
                  className={cn(
                    "rounded-sm transition-all duration-150",
                    hovered === "marginRight"
                      ? "scale-125 bg-gray-800 shadow-md"
                      : "bg-gray-600 hover:scale-[1.15] hover:bg-gray-700"
                  )}
                  style={{ width: "8px", height: "14px" }}
                />
              </div>
            </>
          ) : (
            <>
              {/* Top margin handle */}
              <div
                role="slider"
                tabIndex={0}
                aria-orientation="vertical"
                aria-label={`ขอบบน (Top margin) ${marginTopMm.toFixed(1)} มม.`}
                aria-valuemin={0}
                aria-valuemax={pageHeightMm - marginBottomMm - minContentMm}
                aria-valuenow={Math.round(marginTopMm)}
                onMouseDown={startMarginDrag("marginTop")}
                onTouchStart={startMarginDrag("marginTop")}
                onKeyDown={handleMarginKeyDown("marginTop")}
                onMouseEnter={() =>
                  handleEnter("marginTop", `ขอบบน (Top): ${marginTopMm.toFixed(1)} มม.`)
                }
                onMouseLeave={handleLeave}
                className={cn(
                  "absolute grid cursor-ns-resize place-items-center",
                  hovered === "marginTop" && "z-20"
                )}
                style={{
                  top: `${marginGuideStart}px`,
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "20px",
                  height: "20px",
                }}
              >
                <div
                  className={cn(
                    "rounded-sm transition-all duration-150",
                    hovered === "marginTop"
                      ? "scale-125 bg-gray-800 shadow-md"
                      : "bg-gray-600 hover:scale-[1.15] hover:bg-gray-700"
                  )}
                  style={{ width: "14px", height: "8px" }}
                />
              </div>
              {/* Bottom margin handles — one at the end of every page */}
              {Array.from({ length: Math.max(1, Math.ceil((contentHeight ?? totalPx) / totalPx)) }, (_, i) => (
                <div
                  key={`margin-bottom-handle-${i}`}
                  role="slider"
                  tabIndex={0}
                  aria-orientation="vertical"
                  aria-label={`ขอบล่าง (Bottom margin) ${marginBottomMm.toFixed(1)} มม.`}
                  aria-valuemin={0}
                  aria-valuemax={pageHeightMm - marginTopMm - minContentMm}
                  aria-valuenow={Math.round(marginBottomMm)}
                  onMouseDown={startMarginDrag("marginBottom")}
                  onTouchStart={startMarginDrag("marginBottom")}
                  onKeyDown={handleMarginKeyDown("marginBottom")}
                  onMouseEnter={() =>
                    handleEnter("marginBottom", `ขอบล่าง (Bottom): ${marginBottomMm.toFixed(1)} มม.`)
                  }
                  onMouseLeave={handleLeave}
                  className={cn(
                    "absolute grid cursor-ns-resize place-items-center",
                    hovered === "marginBottom" && "z-20"
                  )}
                  style={{
                    top: `${(i + 1) * totalPx - marginEnd}px`,
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "20px",
                    height: "20px",
                  }}
                >
                  <div
                    className={cn(
                      "rounded-sm transition-all duration-150",
                      hovered === "marginBottom"
                        ? "scale-125 bg-gray-800 shadow-md"
                        : "bg-gray-600 hover:scale-[1.15] hover:bg-gray-700"
                    )}
                    style={{ width: "14px", height: "8px" }}
                  />
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* Indent handles (horizontal interactive ruler only) */}
      {indentInteractive && (
        <>
          {/* △ First-line indent — top triangle, purple */}
          <div
            role="slider"
            tabIndex={0}
            aria-orientation="horizontal"
            aria-label={`ย่อหน้าแรก (First-line indent) ${indentFirst.toFixed(1)} ซม.`}
            aria-valuemin={-indentLeft}
            aria-valuemax={maxIndentCm - indentLeft}
            aria-valuenow={Math.round(indentFirst * 10)}
            onMouseDown={startIndentDrag("first")}
            onTouchStart={startIndentDrag("first")}
            onKeyDown={handleIndentKeyDown("first")}
            onMouseEnter={() =>
              handleEnter("first", `ย่อหน้าแรก (First line): ${indentFirst.toFixed(1)} ซม.`)
            }
            onMouseLeave={handleLeave}
            className={cn(
              "absolute grid cursor-ew-resize place-items-center",
              hovered === "first" && "z-20"
            )}
            style={{
              left: `${firstPx}px`,
              top: "1px",
              transform: "translateX(-50%)",
              width: "20px",
              height: "16px",
            }}
          >
            <div
              className={cn(
                "transition-all duration-150",
                hovered === "first" ? "scale-125" : "hover:scale-[1.15]"
              )}
              style={{
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderBottom: "7px solid #7c3aed",
              }}
            />
          </div>
          {/* ▽ Left indent — bottom triangle, blue */}
          <div
            role="slider"
            tabIndex={0}
            aria-orientation="horizontal"
            aria-label={`ย่อหน้าซ้าย (Left indent) ${indentLeft.toFixed(1)} ซม.`}
            aria-valuemin={0}
            aria-valuemax={maxIndentCm}
            aria-valuenow={Math.round(indentLeft * 10)}
            onMouseDown={startIndentDrag("left")}
            onTouchStart={startIndentDrag("left")}
            onKeyDown={handleIndentKeyDown("left")}
            onMouseEnter={() =>
              handleEnter("left", `ย่อหน้าซ้าย (Left indent): ${indentLeft.toFixed(1)} ซม.`)
            }
            onMouseLeave={handleLeave}
            className={cn(
              "absolute grid cursor-ew-resize place-items-center",
              hovered === "left" && "z-20"
            )}
            style={{
              left: `${leftPx}px`,
              bottom: "1px",
              transform: "translateX(-50%)",
              width: "20px",
              height: "16px",
            }}
          >
            <div
              className={cn(
                "transition-all duration-150",
                hovered === "left" ? "scale-125" : "hover:scale-[1.15]"
              )}
              style={{
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "7px solid #2563eb",
              }}
            />
          </div>
          {/* Hanging indent indicator (small blue square) when textIndent is negative */}
          {indentFirst < 0 && (
            <div
              className="absolute"
              style={{
                left: `${leftPx + indentFirst * PX_PER_CM}px`,
                bottom: "1px",
                transform: "translateX(-50%)",
                width: "6px",
                height: "6px",
                background: "#93c5fd",
                borderRadius: "1px",
                zIndex: 9,
              }}
            />
          )}
        </>
      )}

      {/* Drag tooltip */}
      {tooltip && (
        <Tooltip tooltip={tooltip} />
      )}
    </div>
  );
}

export const Ruler = memo(RulerInner);
