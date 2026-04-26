"use client";

import { cn } from "@/lib/utils";

const PX_PER_CM = 794 / 21; // ~37.81

interface RulerProps {
  orientation: "horizontal" | "vertical";
  cm: number; // total cm to display (21 for H, 29.7 for V)
  marginStart: number; // px from edge to content start
  marginEnd: number; // px from edge to content end
}

interface Tick {
  pos: number;
  major: boolean;
  label: number | null;
}

export function Ruler({ orientation, cm, marginStart, marginEnd }: RulerProps) {
  const isH = orientation === "horizontal";
  const totalPx = cm * PX_PER_CM;

  // Generate tick positions
  const ticks: Tick[] = [];
  const totalCm = Math.floor(cm);
  for (let i = 0; i <= totalCm; i++) {
    ticks.push({ pos: i * PX_PER_CM, major: true, label: i });
    if (i < totalCm) {
      ticks.push({ pos: (i + 0.5) * PX_PER_CM, major: false, label: null });
    }
  }

  // Margin guide positions
  const marginGuideStart = marginStart;
  const marginGuideEnd = totalPx - marginEnd;

  return (
    <div
      className={cn(
        "ruler",
        isH ? "ruler-h" : "ruler-v",
        "relative bg-[color:var(--color-muted)] select-none",
        "border-[color:var(--color-border)]",
        isH ? "h-[18px] border-b" : "w-[18px] border-r"
      )}
      style={{
        [isH ? "width" : "height"]: `${totalPx}px`,
      }}
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
      {/* Margin guides (faint red lines) */}
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
    </div>
  );
}
