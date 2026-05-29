"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { RULER_COLUMN_PX } from "@/lib/page";

const cornerClass =
  "border-b border-r border-[color:var(--color-border)] bg-[color:var(--color-muted)]";

interface EditorRulerBarProps {
  widthPx: number;
  /** Top horizontal ruler (IndentRuler) or empty spacer in preview */
  horizontalRuler?: ReactNode;
  className?: string;
}

/**
 * Fixed bar above the scroll area: corner + horizontal ruler (Word-style).
 * Does not scroll with document content.
 */
export function EditorRulerBar({
  widthPx,
  horizontalRuler,
  className,
}: EditorRulerBarProps) {
  const gridColumns = `${RULER_COLUMN_PX}px ${widthPx}px`;

  return (
    <div
      className={cn("mx-auto", className)}
      style={{ width: widthPx + RULER_COLUMN_PX }}
    >
      <div
        className="grid items-start"
        style={{ gridTemplateColumns: gridColumns }}
      >
        <div className={cn(cornerClass)} aria-hidden="true" />
        <div className="bg-[color:var(--color-muted)]">
          {horizontalRuler ?? (
            <div
              className={cn(cornerClass, "border-b")}
              style={{ height: RULER_COLUMN_PX }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface EditorPaperScrollBodyProps {
  widthPx: number;
  /** Left vertical ruler or empty spacer in preview */
  verticalRuler?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Scrollable body: vertical ruler + paper column (aligned with EditorRulerBar).
 */
export function EditorPaperScrollBody({
  widthPx,
  verticalRuler,
  children,
  className,
}: EditorPaperScrollBodyProps) {
  const gridColumns = `${RULER_COLUMN_PX}px ${widthPx}px`;

  return (
    <div
      className={cn("mx-auto", className)}
      style={{ width: widthPx + RULER_COLUMN_PX }}
    >
      <div
        className="grid items-start"
        style={{ gridTemplateColumns: gridColumns }}
      >
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
