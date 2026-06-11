"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Table as TableIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface TableSizePickerProps {
  editor: Editor | null;
  disabled?: boolean;
}

const MAX_COLS = 10;
const MAX_ROWS = 8;

/**
 * Word-style insert-table grid: hover to pick rows × cols (up to 10×8),
 * click to insert. Tables insert without a header row — Thai official forms
 * use plain cells, and a header row can still be toggled from the context menu.
 */
export function TableSizePicker({ editor, disabled }: TableSizePickerProps) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<{ rows: number; cols: number }>({ rows: 0, cols: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleInsert = useCallback(
    (rows: number, cols: number) => {
      editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run();
      setOpen(false);
      setHover({ rows: 0, cols: 0 });
    },
    [editor]
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title="แทรกตาราง (Insert table)"
        aria-label="แทรกตาราง (Insert table)"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-7 items-center justify-center rounded-md px-2 text-[color:var(--color-muted-foreground)] transition-[background-color,color,box-shadow]",
          "hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--color-surface)]",
          "disabled:pointer-events-none disabled:opacity-40",
          open &&
            "bg-[color:color-mix(in_srgb,var(--color-accent)_10%,var(--color-muted))] text-[color:var(--color-foreground)]"
        )}
      >
        <TableIcon className="size-3.5" />
        <span className="ml-0.5 text-[10px]">▾</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="เลือกขนาดตาราง (Pick table size)"
          className="absolute left-0 top-full z-50 mt-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-2 shadow-lg"
        >
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}
            onMouseLeave={() => setHover({ rows: 0, cols: 0 })}
          >
            {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, i) => {
              const row = Math.floor(i / MAX_COLS) + 1;
              const col = (i % MAX_COLS) + 1;
              const isActive = row <= hover.rows && col <= hover.cols;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`ตาราง ${row}×${col}`}
                  onMouseEnter={() => setHover({ rows: row, cols: col })}
                  onFocus={() => setHover({ rows: row, cols: col })}
                  onClick={() => handleInsert(row, col)}
                  className={cn(
                    "size-4 rounded-[2px] border",
                    isActive
                      ? "border-[color:var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_30%,transparent)]"
                      : "border-[color:var(--color-border)] bg-[color:var(--color-muted)]"
                  )}
                />
              );
            })}
          </div>
          <p className="mt-1.5 text-center text-[11px] text-[color:var(--color-muted-foreground)]">
            {hover.rows > 0
              ? `${hover.rows} แถว × ${hover.cols} คอลัมน์`
              : "เลือกขนาดตาราง"}
          </p>
        </div>
      )}
    </div>
  );
}
