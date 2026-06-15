"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  useRulerDrag,
  snapTabStop,
  TAB_STOP_SNAP_CM,
} from "@/hooks/useRulerDrag";
import {
  MIN_TAB_STOP_CM,
  MAX_TAB_STOP_CM,
} from "@/lib/tiptap/paragraphFormat";
import {
  PAGE_STACK_GAP_PX,
  PX_PER_CM,
} from "@/lib/page";
import {
  TAB_TYPE_GLYPH,
  TAB_TYPE_LABEL,
  type TabType,
} from "@/lib/tiptap/tabStopLayout";

interface RulerProps {
  orientation: "horizontal" | "vertical";
  cm: number;
  marginStart: number; // px from edge to content start
  marginEnd: number;   // px from edge to content end
  // Interactive indent handles (horizontal only, omit for visual-only ruler)
  indentLeft?: number;  // cm
  indentFirst?: number; // cm offset from indentLeft (can be negative)
  indentRight?: number; // cm — right paragraph indent (distance from content right edge)
  onIndentChange?: (marginLeft: number, textIndent: number) => void;
  onIndentRightChange?: (marginRight: number) => void;
  // Double-click affordances (Word-style): margin zone → Page Setup, body → Paragraph
  onOpenPageSetup?: () => void;
  onOpenParagraphDialog?: () => void;
  // Custom ruler tab stops (horizontal only). cm positions, content-relative.
  tabStops?: number[];
  /** Alignment type per tab stop (index-aligned with tabStops). */
  tabStopTypes?: TabType[];
  onTabStopsChange?: (stops: number[]) => void;
  // Margin handles (horizontal or vertical)
  marginLeftMm?: number;
  marginRightMm?: number;
  marginTopMm?: number;
  marginBottomMm?: number;
  onMarginChange?: (aMm: number, bMm: number) => void;
  // Legacy vertical canvas height (avoid for ruler length when pageHeightPx is set).
  contentHeight?: number;
  /** One page height in px — matches `.page-node` (see getPageDimensionsPx). */
  pageHeightPx?: number;
  /** Distance from ruler top to first page top (PageCanvas padding). */
  contentOffsetPx?: number;
  pageCount?: number;
  /** Horizontal ruler length in px (rounded page width). */
  pageWidthPx?: number;
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


function RulerInner({
  orientation,
  cm,
  marginStart,
  marginEnd,
  indentLeft = 0,
  indentFirst = 0,
  indentRight = 0,
  onIndentChange,
  onIndentRightChange,
  onOpenPageSetup,
  onOpenParagraphDialog,
  tabStops = [],
  tabStopTypes = [],
  onTabStopsChange,
  marginLeftMm = 0,
  marginRightMm = 0,
  marginTopMm = 0,
  marginBottomMm = 0,
  onMarginChange,
  contentHeight,
  pageHeightPx,
  contentOffsetPx = 0,
  pageCount = 1,
  pageWidthPx,
  onRulerActive,
}: RulerProps) {
  const isH = orientation === "horizontal";
  const totalPx = isH
    ? (pageWidthPx ?? Math.round(cm * PX_PER_CM))
    : (pageHeightPx ?? Math.round(cm * PX_PER_CM));
  const pages = Math.max(1, pageCount);
  const pageGapPx = PAGE_STACK_GAP_PX;

  const rulerLengthPx = useMemo(() => {
    if (isH) return totalPx;
    if (pageHeightPx != null) {
      return (
        contentOffsetPx +
        pages * pageHeightPx +
        (pages - 1) * pageGapPx
      );
    }
    return contentHeight ?? totalPx;
  }, [
    isH,
    totalPx,
    pageHeightPx,
    contentOffsetPx,
    pages,
    pageGapPx,
    contentHeight,
  ]);

  const indentInteractive = isH && !!onIndentChange;
  const rightIndentInteractive = isH && !!onIndentRightChange;
  const marginInteractive = !!onMarginChange;
  const tabStopsInteractive = isH && !!onTabStopsChange;

  const pageSpanPx = totalPx;

  // Generate tick positions — per page segment for vertical, full width for horizontal
  const ticks: Tick[] = useMemo(() => {
    const result: Tick[] = [];
    if (isH) {
      let i = 0;
      while (i * PX_PER_CM <= rulerLengthPx + 0.001) {
        result.push({ pos: i * PX_PER_CM, major: true, label: i });
        if ((i + 0.5) * PX_PER_CM <= rulerLengthPx + 0.001) {
          result.push({ pos: (i + 0.5) * PX_PER_CM, major: false, label: null });
        }
        i++;
      }
      return result;
    }

    const usePageLayout = pageHeightPx != null;
    const pageSegments = usePageLayout ? pages : 1;
    for (let p = 0; p < pageSegments; p++) {
      const pageStart = usePageLayout
        ? contentOffsetPx + p * (pageSpanPx + pageGapPx)
        : 0;
      const maxInPage = usePageLayout ? pageSpanPx : rulerLengthPx;
      let i = 0;
      while (i * PX_PER_CM <= maxInPage + 0.001) {
        result.push({
          pos: pageStart + i * PX_PER_CM,
          major: true,
          label: i,
        });
        if ((i + 0.5) * PX_PER_CM <= maxInPage + 0.001) {
          result.push({
            pos: pageStart + (i + 0.5) * PX_PER_CM,
            major: false,
            label: null,
          });
        }
        i++;
      }
    }
    return result;
  }, [
    isH,
    rulerLengthPx,
    pageHeightPx,
    pages,
    contentOffsetPx,
    pageSpanPx,
    pageGapPx,
  ]);

  const marginGuideStart = isH ? marginStart : contentOffsetPx + marginStart;
  const marginGuideEnd = isH
    ? totalPx - marginEnd
    : contentOffsetPx + pageSpanPx - marginEnd;

  const verticalPageCount = !isH && pageHeightPx != null ? pages : Math.max(1, Math.ceil((contentHeight ?? totalPx) / totalPx));

  // Pixel positions of indent handles
  const leftPx = marginStart + indentLeft * PX_PER_CM;
  const firstPx = marginStart + (indentLeft + indentFirst) * PX_PER_CM;
  // Right-indent marker sits inward from the content's right edge (marginGuideEnd).
  const rightPx = marginGuideEnd - indentRight * PX_PER_CM;

  const maxIndentCm = (totalPx - marginEnd - marginStart) / PX_PER_CM;
  const pageWidthMm = cm * 10;
  const pageHeightMm = cm * 10;
  const minContentMm = 20; // minimum 2cm content width/height

  const { dragRef, tooltip, startDrag, handleKeyDown } = useRulerDrag({
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


  // Hover state helpers
  const [hovered, setHovered] = useState<string | null>(null);

  // Visible focus indicator for keyboard users on slider handles
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:rounded-sm";

  const handleEnter = (id: string, label: string) => {
    setHovered(id);
    if (!dragRef.current) onRulerActive?.({ label });
  };

  const handleLeave = () => {
    setHovered(null);
    if (!dragRef.current) onRulerActive?.(null);
  };

  // Word-style double-click: the margin zone/handle opens Page Setup; the body
  // (white indent area) opens the Paragraph dialog. Tab-stop markers keep their
  // own double-click (remove), so bail out when the event started on one.
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onOpenPageSetup && !onOpenParagraphDialog) return;
    const target = e.target as HTMLElement | null;
    // Tab-stop markers (remove on dblclick) and the add-tab track own their gestures.
    if (target?.closest(".ruler-tab-stop")) return;
    if (target?.closest('[data-testid="ruler-tab-track"]')) return;
    if (target?.closest("[data-ruler-margin]")) {
      onOpenPageSetup?.();
      return;
    }
    if (!isH) {
      onOpenPageSetup?.();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < marginStart || x > marginGuideEnd) {
      onOpenPageSetup?.();
      return;
    }
    if (indentInteractive) onOpenParagraphDialog?.();
  };

  // Add a new tab stop where the user CLICKS the lower-half track.
  // Click (not mousedown) so a drag — including grabbing an existing marker —
  // never spuriously adds a stop. Also bail out if the event originated on a
  // tab-stop marker so a click a pixel off the glyph grabs it instead of adding.
  const handleTrackAddTabStop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tabStopsInteractive || !onTabStopsChange) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest(".ruler-tab-stop")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - marginStart;
    const cmPos = snapTabStop(px / PX_PER_CM);
    if (cmPos < MIN_TAB_STOP_CM || cmPos > MAX_TAB_STOP_CM) return;
    // Skip if a stop already exists at this snapped position.
    if (tabStops.some((s) => Math.abs(s - cmPos) < TAB_STOP_SNAP_CM / 2)) return;
    onTabStopsChange([...tabStops, cmPos]);
  };

  // Keyboard a11y for an individual tab-stop marker.
  const handleTabStopKeyDown =
    (index: number) => (e: React.KeyboardEvent) => {
      if (!onTabStopsChange) return;
      const stop = tabStops[index];
      if (stop == null) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onTabStopsChange(tabStops.filter((_, i) => i !== index));
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const delta = e.key === "ArrowRight" ? TAB_STOP_SNAP_CM : -TAB_STOP_SNAP_CM;
        const next = Math.round(
          Math.max(MIN_TAB_STOP_CM, Math.min(MAX_TAB_STOP_CM, stop + delta)) * 100
        ) / 100;
        const updated = tabStops.map((s, i) => (i === index ? next : s));
        onTabStopsChange(updated);
        onRulerActive?.({
          label: "แท็บ (Tab stop): " + next.toFixed(2) + " ซม.",
        });
      }
    };

  return (
    <div
      className={cn(
        "ruler",
        isH ? "ruler-h" : "ruler-v",
        "relative bg-[color:var(--color-muted)] select-none",
        "border-[color:var(--color-border)]",
        isH ? "h-[18px] border-b" : "w-[18px] overflow-hidden border-r"
      )}
      style={{ [isH ? "width" : "height"]: `${rulerLengthPx}px` }}
      onDoubleClick={handleDoubleClick}
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
        Array.from({ length: verticalPageCount }, (_, i) => {
          const pageBottom =
            pageHeightPx != null
              ? contentOffsetPx + (i + 1) * pageSpanPx + i * pageGapPx
              : (i + 1) * totalPx;
          return (
            <div
              key={`margin-guide-end-${i}`}
              className="absolute"
              style={{
                background: "oklch(70% 0.15 25 / 0.5)",
                top: `${pageBottom - marginEnd}px`,
                left: 0,
                right: 0,
                height: "1px",
              }}
            />
          );
        })
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
                data-ruler-margin="left"
                aria-orientation="horizontal"
                aria-label={`ขอบซ้าย (Left margin) ${marginLeftMm.toFixed(1)} มม.`}
                aria-valuemin={0}
                aria-valuemax={pageWidthMm - marginRightMm - minContentMm}
                aria-valuenow={Math.round(marginLeftMm)}
                onMouseDown={startDrag("marginLeft")}
                onTouchStart={startDrag("marginLeft")}
                onKeyDown={handleKeyDown("marginLeft")}
                onMouseEnter={() =>
                  handleEnter("marginLeft", `ขอบซ้าย (Left): ${marginLeftMm.toFixed(1)} มม.`)
                }
                onMouseLeave={handleLeave}
                className={cn(
                  "absolute z-10 grid cursor-ew-resize place-items-center",
                  focusRing,
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
                    "rounded-sm transition-[transform,background-color,box-shadow] duration-150",
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
                data-ruler-margin="right"
                aria-orientation="horizontal"
                aria-label={`ขอบขวา (Right margin) ${marginRightMm.toFixed(1)} มม.`}
                aria-valuemin={0}
                aria-valuemax={pageWidthMm - marginLeftMm - minContentMm}
                aria-valuenow={Math.round(marginRightMm)}
                onMouseDown={startDrag("marginRight")}
                onTouchStart={startDrag("marginRight")}
                onKeyDown={handleKeyDown("marginRight")}
                onMouseEnter={() =>
                  handleEnter("marginRight", `ขอบขวา (Right): ${marginRightMm.toFixed(1)} มม.`)
                }
                onMouseLeave={handleLeave}
                className={cn(
                  "absolute z-10 grid cursor-ew-resize place-items-center",
                  focusRing,
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
                    "rounded-sm transition-[transform,background-color,box-shadow] duration-150",
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
                data-ruler-margin="top"
                aria-orientation="vertical"
                aria-label={`ขอบบน (Top margin) ${marginTopMm.toFixed(1)} มม.`}
                aria-valuemin={0}
                aria-valuemax={pageHeightMm - marginBottomMm - minContentMm}
                aria-valuenow={Math.round(marginTopMm)}
                onMouseDown={startDrag("marginTop")}
                onTouchStart={startDrag("marginTop")}
                onKeyDown={handleKeyDown("marginTop")}
                onMouseEnter={() =>
                  handleEnter("marginTop", `ขอบบน (Top): ${marginTopMm.toFixed(1)} มม.`)
                }
                onMouseLeave={handleLeave}
                className={cn(
                  "absolute grid cursor-ns-resize place-items-center",
                  focusRing,
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
                    "rounded-sm transition-[transform,background-color,box-shadow] duration-150",
                    hovered === "marginTop"
                      ? "scale-125 bg-gray-800 shadow-md"
                      : "bg-gray-600 hover:scale-[1.15] hover:bg-gray-700"
                  )}
                  style={{ width: "14px", height: "8px" }}
                />
              </div>
              {/* Bottom margin handles — one at the end of every page */}
              {Array.from({ length: verticalPageCount }, (_, i) => {
                const pageBottom =
                  pageHeightPx != null
                    ? contentOffsetPx + (i + 1) * pageSpanPx + i * pageGapPx
                    : (i + 1) * totalPx;
                return (
                <div
                  key={`margin-bottom-handle-${i}`}
                  role="slider"
                  tabIndex={0}
                  data-ruler-margin="bottom"
                  aria-orientation="vertical"
                  aria-label={`ขอบล่าง (Bottom margin) ${marginBottomMm.toFixed(1)} มม.`}
                  aria-valuemin={0}
                  aria-valuemax={pageHeightMm - marginTopMm - minContentMm}
                  aria-valuenow={Math.round(marginBottomMm)}
                  onMouseDown={startDrag("marginBottom")}
                  onTouchStart={startDrag("marginBottom")}
                  onKeyDown={handleKeyDown("marginBottom")}
                  onMouseEnter={() =>
                    handleEnter("marginBottom", `ขอบล่าง (Bottom): ${marginBottomMm.toFixed(1)} มม.`)
                  }
                  onMouseLeave={handleLeave}
                  className={cn(
                    "absolute grid cursor-ns-resize place-items-center",
                    focusRing,
                    hovered === "marginBottom" && "z-20"
                  )}
                  style={{
                    top: `${pageBottom - marginEnd}px`,
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "20px",
                    height: "20px",
                  }}
                >
                  <div
                    className={cn(
                      "rounded-sm transition-[transform,background-color,box-shadow] duration-150",
                      hovered === "marginBottom"
                        ? "scale-125 bg-gray-800 shadow-md"
                        : "bg-gray-600 hover:scale-[1.15] hover:bg-gray-700"
                    )}
                  style={{ width: "14px", height: "8px" }}
                />
              </div>
              );
              })}
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
            aria-valuemin={Math.round(-indentLeft * 10)}
            aria-valuemax={Math.round((maxIndentCm - indentLeft) * 10)}
            aria-valuenow={Math.round(indentFirst * 10)}
            aria-valuetext={`${indentFirst.toFixed(2)} ซม. (${indentFirst.toFixed(2)} cm)`}
            onMouseDown={startDrag("first")}
            onTouchStart={startDrag("first")}
            onKeyDown={handleKeyDown("first")}
            onMouseEnter={() =>
              handleEnter("first", `ย่อหน้าแรก (First line): ${indentFirst.toFixed(1)} ซม.`)
            }
            onMouseLeave={handleLeave}
            className={cn(
              "absolute grid cursor-ew-resize place-items-center",
              focusRing,
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
                "transition-transform duration-150",
                hovered === "first" ? "scale-125" : "hover:scale-[1.15]"
              )}
              style={{
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderBottom: "7px solid var(--color-accent)",
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
            aria-valuemax={Math.round(maxIndentCm * 10)}
            aria-valuenow={Math.round(indentLeft * 10)}
            aria-valuetext={`${indentLeft.toFixed(2)} ซม. (${indentLeft.toFixed(2)} cm)`}
            onMouseDown={startDrag("left")}
            onTouchStart={startDrag("left")}
            onKeyDown={handleKeyDown("left")}
            onMouseEnter={() =>
              handleEnter("left", `ย่อหน้าซ้าย (Left indent): ${indentLeft.toFixed(1)} ซม.`)
            }
            onMouseLeave={handleLeave}
            className={cn(
              "absolute grid cursor-ew-resize place-items-center",
              focusRing,
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
                "transition-transform duration-150",
                hovered === "left" ? "scale-125" : "hover:scale-[1.15]"
              )}
              style={{
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "7px solid color-mix(in srgb, var(--color-accent) 80%, var(--color-foreground))",
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
                background: "color-mix(in srgb, var(--color-accent) 55%, var(--color-surface))",
                borderRadius: "1px",
                zIndex: 9,
              }}
            />
          )}
          {/* ◼ Left-indent square (Word combined marker) — a mouse/touch grab that
              drags first-line + left together. Not a slider: the bottom triangle
              already exposes the accessible "Left indent" control, so this stays
              aria-hidden to avoid a duplicate slider for screen readers. */}
          <div
            aria-hidden="true"
            onMouseDown={startDrag("left")}
            onTouchStart={startDrag("left")}
            onMouseEnter={() =>
              handleEnter("leftSquare", `เยื้องซ้ายทั้งย่อหน้า (Left indent): ${indentLeft.toFixed(1)} ซม.`)
            }
            onMouseLeave={handleLeave}
            className={cn(
              "absolute grid cursor-ew-resize place-items-center",
              hovered === "leftSquare" && "z-20"
            )}
            style={{
              left: `${leftPx}px`,
              bottom: "-5px",
              transform: "translateX(-50%)",
              width: "16px",
              height: "10px",
            }}
          >
            <div
              className={cn(
                "transition-transform duration-150",
                hovered === "leftSquare" ? "scale-125" : "hover:scale-[1.15]"
              )}
              style={{
                width: "9px",
                height: "6px",
                background: "color-mix(in srgb, var(--color-accent) 80%, var(--color-foreground))",
                borderRadius: "1px",
              }}
            />
          </div>
        </>
      )}

      {/* ▽ Right indent — bottom triangle near the content right edge */}
      {rightIndentInteractive && (
        <div
          role="slider"
          tabIndex={0}
          aria-orientation="horizontal"
          aria-label={`ย่อหน้าขวา (Right indent) ${indentRight.toFixed(1)} ซม.`}
          aria-valuemin={0}
          aria-valuemax={Math.round(Math.max(0, maxIndentCm - indentLeft - 1) * 10)}
          aria-valuenow={Math.round(indentRight * 10)}
          aria-valuetext={`${indentRight.toFixed(2)} ซม. (${indentRight.toFixed(2)} cm)`}
          onMouseDown={startDrag("right")}
          onTouchStart={startDrag("right")}
          onKeyDown={handleKeyDown("right")}
          onMouseEnter={() =>
            handleEnter("right", `ย่อหน้าขวา (Right indent): ${indentRight.toFixed(1)} ซม.`)
          }
          onMouseLeave={handleLeave}
          className={cn(
            "absolute grid cursor-ew-resize place-items-center",
            focusRing,
            hovered === "right" && "z-20"
          )}
          style={{
            left: `${rightPx}px`,
            bottom: "1px",
            transform: "translateX(-50%)",
            width: "20px",
            height: "16px",
          }}
        >
          <div
            className={cn(
              "transition-transform duration-150",
              hovered === "right" ? "scale-125" : "hover:scale-[1.15]"
            )}
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "7px solid color-mix(in srgb, var(--color-accent) 80%, var(--color-foreground))",
            }}
          />
        </div>
      )}

      {/* Custom tab stops (horizontal interactive ruler only) */}
      {tabStopsInteractive && (
        <>
          {/* Lower-half click target: click empty space to add a tab stop */}
          <div
            data-testid="ruler-tab-track"
            className="absolute left-0 right-0 bottom-0 h-[9px] cursor-copy"
            style={{ zIndex: 5 }}
            onClick={handleTrackAddTabStop}
          />
          {tabStops.map((stop, i) => {
            const left = marginStart + stop * PX_PER_CM;
            const id = `tabStop-${i}`;
            const type = tabStopTypes[i] ?? "left";
            return (
              <div
                key={id}
                role="slider"
                tabIndex={0}
                aria-orientation="horizontal"
                aria-label={`แท็บ ${TAB_TYPE_LABEL[type]} (Tab stop) ${stop.toFixed(2)} ซม.`}
                aria-valuemin={MIN_TAB_STOP_CM}
                aria-valuemax={MAX_TAB_STOP_CM}
                aria-valuenow={stop}
                aria-valuetext={`${stop.toFixed(2)} ซม. (${stop.toFixed(2)} cm)`}
                onMouseDown={startDrag("tabStop", i)}
                onTouchStart={startDrag("tabStop", i)}
                onKeyDown={handleTabStopKeyDown(i)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  onTabStopsChange?.(tabStops.filter((_, j) => j !== i));
                }}
                onMouseEnter={() =>
                  handleEnter(id, `แท็บ (Tab stop): ${stop.toFixed(2)} ซม.`)
                }
                onMouseLeave={handleLeave}
                className={cn(
                  "ruler-tab-stop absolute cursor-ew-resize",
                  focusRing,
                  hovered === id && "z-20"
                )}
                style={{
                  left: `${left}px`,
                  bottom: "0px",
                  transform: "translateX(-50%)",
                  zIndex: hovered === id ? 20 : 8,
                }}
              >
                <span className="ruler-tab-stop-glyph" aria-hidden="true">
                  {TAB_TYPE_GLYPH[type]}
                </span>
              </div>
            );
          })}
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
