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
}

interface Tick {
  pos: number;
  major: boolean;
  label: number | null;
}

interface DragState {
  type: "left" | "first";
  startX: number;
  startLeft: number;
  startFirst: number;
}

export function Ruler({
  orientation,
  cm,
  marginStart,
  marginEnd,
  indentLeft = 0,
  indentFirst = 0,
  onIndentChange,
}: RulerProps) {
  const isH = orientation === "horizontal";
  const totalPx = cm * PX_PER_CM;
  const interactive = isH && !!onIndentChange;

  const dragRef = useRef<DragState | null>(null);

  // Generate tick positions
  const ticks: Tick[] = [];
  const totalCm = Math.floor(cm);
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

  const snap = (v: number) => Math.round(v * 10) / 10;
  const clamp = (v: number) =>
    Math.max(0, Math.min(v, (totalPx - marginEnd - marginStart) / PX_PER_CM));

  useEffect(() => {
    if (!interactive) return;

    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || !onIndentChange) return;
      const dx = e.clientX - drag.startX;
      const dCm = dx / PX_PER_CM;

      if (drag.type === "left") {
        const newLeft = clamp(snap(drag.startLeft + dCm));
        onIndentChange(newLeft, drag.startFirst);
      } else {
        const newFirst = snap(drag.startFirst + dCm);
        onIndentChange(drag.startLeft, newFirst);
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
  }, [interactive, onIndentChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag =
    (type: "left" | "first") => (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = {
        type,
        startX: e.clientX,
        startLeft: indentLeft,
        startFirst: indentFirst,
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
      style={{ [isH ? "width" : "height"]: `${totalPx}px` }}
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

      {/* Indent triangles (horizontal interactive ruler only) */}
      {interactive && (
        <>
          {/* ▽ Left indent — bottom triangle, blue */}
          <div
            aria-label={`left indent ${indentLeft.toFixed(1)}cm`}
            title={`indent ซ้าย: ${indentLeft.toFixed(1)}cm — ลากเพื่อปรับ`}
            onMouseDown={startDrag("left")}
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
            onMouseDown={startDrag("first")}
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
