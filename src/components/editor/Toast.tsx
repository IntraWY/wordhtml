"use client";

import { CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import { useToastStore } from "@/store/toastStore";

const TYPE_STYLES: Record<string, { icon: typeof CheckCircle; color: string }> = {
  success: { icon: CheckCircle, color: "text-emerald-400" },
  error: { icon: AlertCircle, color: "text-red-400" },
  warning: { icon: AlertTriangle, color: "text-amber-400" },
};

export function Toast() {
  const message = useToastStore((s) => s.message);
  const type = useToastStore((s) => s.type);

  const style = TYPE_STYLES[type ?? "success"];
  const Icon = style.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={[
        "fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-lg px-4 py-2.5",
        "bg-[color:var(--color-foreground)] text-[color:var(--color-background)]",
        "text-sm font-medium shadow-lg",
        "transition-all duration-300",
        message
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-2 opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <Icon className={["size-4 shrink-0", style.color].join(" ")} />
      {message}
    </div>
  );
}
