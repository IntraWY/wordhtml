"use client";

interface PageBreakIndicatorProps {
  pageBreaks: number[];
}

export function PageBreakIndicator({ pageBreaks }: PageBreakIndicatorProps) {
  if (!pageBreaks || pageBreaks.length <= 1) return null;
  // Skip index 0 because it is the start of page 1 (not a break between pages).
  const breaks = pageBreaks.slice(1);
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {breaks.map((y, i) => (
        <div
          key={i}
          className="page-break-indicator"
          style={{ top: `${y}px` }}
        >
          <span className="page-break-indicator-label">
            หน้า {i + 2}
          </span>
        </div>
      ))}
    </div>
  );
}
