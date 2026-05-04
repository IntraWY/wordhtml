"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const PX_PER_CM = 794 / 21; // ~37.81

interface RulerProps {
  orientation: "horizontal" | "vertical";
  cm: number;
  marginStart: number; // px from edge to content start
  marginEnd: number;   // px from edge to content end
  // Interactive indent handles (horizontal only, omit for visual-only ruler)
  indentLeft?: number;  // cm
  indentFirst?: number; // cm offset from indentLeft (can be negative)
  onIndentChange?: (marginLeft: number, textIndent: number) => void;
  // Margin handles (horizontal only)
  marginLeftMm?: number;
  marginRightMm?: number;
  onMarginChange?: (leftMm: number, rightMm: number) => void;
  // Actual content height in px (vertical only). When provided the ruler
  // extends to cover the full scrollable content, not just one page.
  contentHeight?: number;
}

interface Tick {
  pos: number;
  major: boolean;
  label: number | null;
}

interface DragState {
  type: "left" | "first" | "marginLeft" | "marginRight";
  startX: number;
  startLeft: number;
  startFirst: number;
  startMarginLeftMm: number;
  startMarginRightMm: number;
}

export function Ruler({
  orientation,
  cm,
  marginStart,
  marginEnd,
  indentLeft = 0,
  indentFirst = 0,
  onIndentChange,
  marginLeftMm = 0,
  marginRightMm = 0,
  onMarginChange,
  contentHeight,
}: RulerProps) {
  const isH = orientation === "horizontal";
  const totalPx = cm * PX_PER_CM;
  const rulerHeightPx = !isH && contentHeight ? contentHeight : totalPx;
  const indentInteractive = isH && !!onIndentChange;
  const marginInteractive = isH && !!onMarginChange;
  const anyInteractive = indentInteractive || marginInteractive;

  const dragRef = useRef<DragState | null>(null);

  // Generate tick positions
  const ticks: Tick[] = [];
  const totalCm = Math.floor(isH ? cm : rulerHeightPx / PX_PER_CM);
  for (let i = 0; i <= totalCm; i++) {
    ticks.push({ pos: i * PX_PER_CM, major: true, label: i });
    if (i < totalCm) {
      ticks.push({ pos: (i + 0.5) * PX_PER_CM, major: false, label: null });
    }
  }

  const marginGuideStart = marginStart;
  const marginGuideEnd = totalPx - marginEnd;

  // Pixel positions of the two triangles
  const leftPx = marginStart + indentLeft * PX_PER_CM;
  const firstPx = marginStart + (indentLeft + indentFirst) * PX_PER_CM;

  const maxIndentCm = (totalPx - marginEnd - marginStart) / PX_PER_CM;
  const pageWidthMm = cm * 10;
  const minContentMm = 20; // minimum 2cm content width

  useEffect(() => {
    if (!anyInteractive) return;

    const snap = (v: number) => Math.round(v * 10) / 10;
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
    const pxToMm = (px: number) => (px / PX_PER_CM) * 10;

    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dMm = pxToMm(dx);

      if (drag.type === "left") {
        if (!onIndentChange) return;
        const newLeft = clamp(
          snap(drag.startLeft + dMm / 10),
          0,
          maxIndentCm
        );
        onIndentChange(newLeft, drag.startFirst);
      } else if (drag.type === "first") {
        if (!onIndentChange) return;
        const newFirst = snap(drag.startFirst + dMm / 10);
        onIndentChange(drag.startLeft, newFirst);
      } else if (drag.type === "marginLeft") {
        if (!onMarginChange) return;
        const newLeft = clamp(
          drag.startMarginLeftMm + dMm,
          0,
          pageWidthMm - drag.startMarginRightMm - minContentMm
        );
        onMarginChange(newLeft, drag.startMarginRightMm);
      } else if (drag.type === "marginRight") {
        if (!onMarginChange) return;
        const newRight = clamp(
          drag.startMarginRightMm - dMm,
          0,
          pageWidthMm - drag.startMarginLeftMm - minContentMm
        );
        onMarginChange(drag.startMarginLeftMm, newRight);
      }
    };

    const onMouseUp = () => {
      dragRef.current = null;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [anyInteractive, onIndentChange, onMarginChange, maxIndentCm, pageWidthMm]);

  const startIndentDrag =
    (type: "left" | "first") => (e: React.MouseEvent) => {
      e.preventDefault();
      // eslint-disable-next-line react-hooks/refs
      dragRef.current = {
        type,
        startX: e.clientX,
        startLeft: indentLeft,
        startFirst: indentFirst,
        startMarginLeftMm: marginLeftMm,
        startMarginRightMm: marginRightMm,
      };
    };

  const startMarginDrag =
    (type: "marginLeft" | "marginRight") => (e: React.MouseEvent) => {
      e.preventDefault();
      // eslint-disable-next-line react-hooks/refs
      dragRef.current = {
        type,
        startX: e.clientX,
        startLeft: indentLeft,
        startFirst: indentFirst,
        startMarginLeftMm: marginLeftMm,
        startMarginRightMm: marginRightMm,
      };
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
      style={{ [isH ? "width" : "height"]: `${rulerHeightPx}px` }}
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
      <div
        className="absolute"
        style={{
          background: "oklch(70% 0.15 25 / 0.5)",
          ...(isH
            ? { left: `${marginGuideEnd}px`, top: 0, bottom: 0, width: "1px" }
            : { top: `${marginGuideEnd}px`, left: 0, right: 0, height: "1px" }),
        }}
      />

      {/* Margin handles (horizontal only) */}
      {marginInteractive && (
        <>
          {/* Left margin handle */}
          <div
            aria-label={`left margin ${marginLeftMm.toFixed(1)}mm`}
            title={`ขอบซ้าย: ${marginLeftMm.toFixed(1)}mm — ลากเพื่อปรับ`}
            onMouseDown={startMarginDrag("marginLeft")}
            style={{
              position: "absolute",
              left: `${marginGuideStart}px`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "6px",
              height: "6px",
              background: "#6b7280",
              borderRadius: "1px",
              cursor: "ew-resize",
              zIndex: 11,
            }}
          />
          {/* Right margin handle */}
          <div
            aria-label={`right margin ${marginRightMm.toFixed(1)}mm`}
            title={`ขอบขวา: ${marginRightMm.toFixed(1)}mm — ลากเพื่อปรับ`}
            onMouseDown={startMarginDrag("marginRight")}
            style={{
              position: "absolute",
              left: `${marginGuideEnd}px`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "6px",
              height: "6px",
              background: "#6b7280",
              borderRadius: "1px",
              cursor: "ew-resize",
              zIndex: 11,
            }}
          />
        </>
      )}

      {/* Indent triangles (horizontal interactive ruler only) */}
      {indentInteractive && (
        <>
          {/* ▽ Left indent — bottom triangle, blue */}
          <div
            aria-label={`left indent ${indentLeft.toFixed(1)}cm`}
            title={`indent ซ้าย: ${indentLeft.toFixed(1)}cm — ลากเพื่อปรับ`}
            onMouseDown={startIndentDrag("left")}
            style={{
              position: "absolute",
              left: `${leftPx}px`,
              bottom: 0,
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "7px solid #2563eb",
              cursor: "ew-resize",
              zIndex: 10,
            }}
          />
          {/* △ First-line indent — top triangle, purple */}
          <div
            aria-label={`first-line indent ${indentFirst.toFixed(1)}cm`}
            title={`indent บรรทัดแรก: ${indentFirst.toFixed(1)}cm — ลากเพื่อปรับ`}
            onMouseDown={startIndentDrag("first")}
            style={{
              position: "absolute",
              left: `${firstPx}px`,
              top: 1,
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderBottom: "7px solid #7c3aed",
              cursor: "ew-resize",
              zIndex: 10,
            }}
          />
        </>
      )}
    </div>
  );
}
