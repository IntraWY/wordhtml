"use client";

import { useToastStore } from "@/store/toastStore";

export function Toast() {
  const message = useToastStore((s) => s.message);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={[
        "fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-lg px-4 py-2.5",
        "bg-[color:var(--color-foreground)] text-[color:var(--color-background)]",
        "text-sm font-medium shadow-lg",
        "transition-all duration-200",
        message
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-2 opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <span className="size-1.5 rounded-full bg-[color:var(--color-success)] shrink-0" />
      {message}
    </div>
  );
}
