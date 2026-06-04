"use client";

import { cn } from "@/lib/utils";

interface RibbonSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  className?: string;
  disabled?: boolean;
}

export function RibbonSelect({ label, value, onChange, options, className, disabled }: RibbonSelectProps) {
  const nameVal = label.replace(/[^a-zA-Z0-9ก-ฮ]/g, "-").toLowerCase();
  return (
    <select
      name={`ribbon-${nameVal}`}
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-7 appearance-none rounded-md border border-transparent bg-transparent px-2 text-xs text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-accent)] hover:bg-[color:var(--color-muted)] cursor-pointer",
        className
      )}
    >
      {options.map((opt) => (
        <option 
          key={opt.value} 
          value={opt.value}
          style={{ fontFamily: opt.value }}
        >
          {opt.label}
        </option>
      ))}
    </select>
  );
}
