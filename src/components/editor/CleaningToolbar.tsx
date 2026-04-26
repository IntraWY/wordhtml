"use client";

import { Check } from "lucide-react";

import { CLEANERS } from "@/types";
import { useEditorStore } from "@/store/editorStore";
import { cn } from "@/lib/utils";

export function CleaningToolbar() {
  const enabledCleaners = useEditorStore((s) => s.enabledCleaners);
  const toggleCleaner = useEditorStore((s) => s.toggleCleaner);

  return (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-5 py-2.5">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
        ทำความสะอาดตอนส่งออก
      </span>
      <span className="text-[color:var(--color-border-strong)]">·</span>
      {CLEANERS.map(({ key, label, description }) => {
        const enabled = enabledCleaners.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggleCleaner(key)}
            title={description}
            aria-pressed={enabled}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-muted)]",
              enabled
                ? "border-transparent bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
                : "border-[color:var(--color-border)] bg-[color:var(--color-background)] text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
            )}
          >
            {enabled && <Check className="size-3" strokeWidth={3} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
