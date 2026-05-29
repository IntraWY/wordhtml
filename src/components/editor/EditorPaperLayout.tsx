"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { RULER_COLUMN_PX } from "@/lib/page";

const cornerClass =
  "border-b border-r border-[color:var(--color-border)] bg-[color:var(--color-muted)]";

interface EditorPaperLayoutProps {
  widthPx: number;
  /** Top horizontal ruler (IndentRuler) or empty spacer in preview */
  horizontalRuler?: ReactNode;
  /** Left vertical ruler or empty spacer in preview */
  verticalRuler?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Shared Word-style 2×2 grid: corner + horizontal ruler / vertical ruler + paper.
 * Corner and horizontal ruler are sticky so they stay aligned while scrolling.
 */
export function EditorPaperLayout({
  widthPx,
  horizontalRuler,
  verticalRuler,
  children,
  className,
}: EditorPaperLayoutProps) {
  const gridColumns = `${RULER_COLUMN_PX}px ${widthPx}px`;

  return (
    <div
      className={cn("mx-auto", className)}
      style={{ width: widthPx + RULER_COLUMN_PX }}
    >
      <div
        className="grid items-start"
        style={{
          gridTemplateColumns: gridColumns,
          gridTemplateRows: `${RULER_COLUMN_PX}px auto`,
        }}
      >
        <div
          className={cn(cornerClass, "sticky top-0 z-20")}
          aria-hidden="true"
        />
        <div className="sticky top-0 z-20 bg-[color:var(--color-muted)]">
          {horizontalRuler ?? (
            <div
              className={cn(cornerClass, "border-b")}
              style={{ height: RULER_COLUMN_PX }}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="self-start">
          {verticalRuler ?? (
            <div
              className={cn(cornerClass, "border-r")}
              style={{ width: RULER_COLUMN_PX }}
              aria-hidden="true"
            />
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
