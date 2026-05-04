"use client";

interface PaginationManagerProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function PaginationManager({ totalPages, currentPage, onPageChange }: PaginationManagerProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination-manager">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
        className="rounded px-2 py-0.5 text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)] disabled:opacity-30"
      >
        ‹
      </button>
      <span className="min-w-[3ch] text-center tabular-nums">
        {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
        className="rounded px-2 py-0.5 text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)] disabled:opacity-30"
      >
        ›
      </button>
    </div>
  );
}
