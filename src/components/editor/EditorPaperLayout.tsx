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
  return (
    <div
      className={cn("mx-auto", className)}
      style={{ width: widthPx + RULER_COLUMN_PX }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `${RULER_COLUMN_PX}px ${widthPx}px`,
          gridTemplateRows: `${RULER_COLUMN_PX}px auto`,
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
