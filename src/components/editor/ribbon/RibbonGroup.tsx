"use client";

import { cn } from "@/lib/utils";

interface RibbonGroupProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function RibbonGroup({ label, children, className }: RibbonGroupProps) {
  return (
    <div className={cn("flex flex-col gap-1 border-r border-[color:var(--color-border)] px-3 py-2 last:border-r-0", className)}>
      <div className="text-[9px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
        {label}
      </div>
      <div className="flex items-center gap-1">
        {children}
      </div>
    </div>
  );
}
