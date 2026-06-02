"use client";

import { cn } from "@/lib/utils";

interface RibbonButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function RibbonButton({ label, onClick, disabled, active, children, className }: RibbonButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-md px-2 text-[color:var(--color-muted-foreground)] transition-all",
        "hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
        "active:bg-[color:color-mix(in_srgb,var(--color-muted)_70%,var(--color-accent)_12%)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--color-surface)]",
        "disabled:pointer-events-none disabled:opacity-40",
        "[&_svg]:size-3.5",
        active &&
          "bg-[color:color-mix(in_srgb,var(--color-accent)_10%,var(--color-muted))] text-[color:var(--color-foreground)] ring-1 ring-[color:color-mix(in_srgb,var(--color-accent)_30%,transparent)]",
        className
      )}
    >
      {children}
    </button>
  );
}
