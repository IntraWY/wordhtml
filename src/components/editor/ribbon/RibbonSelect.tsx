"use client";

import { cn } from "@/lib/utils";

interface RibbonSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  className?: string;
}

export function RibbonSelect({ label, value, onChange, options, className }: RibbonSelectProps) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-7 appearance-none rounded-md border border-transparent bg-transparent px-2 text-xs text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-accent)] hover:bg-[color:var(--color-muted)] cursor-pointer",
        className
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
