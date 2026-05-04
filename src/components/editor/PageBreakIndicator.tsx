"use client";

interface PageBreakIndicatorProps {
  pageBreaks: number[];
}

export function PageBreakIndicator({ pageBreaks }: PageBreakIndicatorProps) {
  if (!pageBreaks || pageBreaks.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {pageBreaks.map((y, i) => (
        <div
          key={i}
          className="page-break-indicator"
          style={{ top: `${y}px` }}
        >
          <span className="page-break-indicator-label">
            {i + 2}
          </span>
        </div>
      ))}
    </div>
  );
}
