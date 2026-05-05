"use client";

import { useToastStore } from "@/store/toastStore";

const TYPE_COLORS: Record<string, string> = {
  success: "bg-[color:var(--color-success)]",
  error: "bg-[color:var(--color-destructive)]",
  warning: "bg-amber-400",
};

export function Toast() {
  const message = useToastStore((s) => s.message);
  const type = useToastStore((s) => s.type);

  const dotColor = TYPE_COLORS[type ?? "success"];

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
      <span className={["size-1.5 rounded-full shrink-0", dotColor].join(" ")} />
      {message}
    </div>
  );
}
