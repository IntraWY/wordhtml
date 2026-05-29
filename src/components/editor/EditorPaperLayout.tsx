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

/** Shared Word-style grid: ruler column + paper column (edit and preview). */
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
      {/* Row 1: sticky horizontal ruler (Word-style — stays at top when scrolling) */}
      <div
        className="sticky top-0 z-20 grid border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)]"
        style={{
          gridTemplateColumns: gridColumns,
          gridTemplateRows: `${RULER_COLUMN_PX}px`,
        }}
      >
        <div className={cornerClass} aria-hidden="true" />
        {horizontalRuler ?? (
          <div
            className={cn(cornerClass, "border-b")}
            style={{ height: RULER_COLUMN_PX }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Row 2: vertical ruler + paper (scrolls with content) */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: gridColumns,
        }}
      >
        {verticalRuler ?? (
          <div
            className={cn(cornerClass, "border-r")}
            style={{ width: RULER_COLUMN_PX }}
            aria-hidden="true"
          />
        )}
        {children}
      </div>
    </div>
  );
}
