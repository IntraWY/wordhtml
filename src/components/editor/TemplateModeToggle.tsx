"use client";

import { useEditorStore } from "@/store/editorStore";
import { cn } from "@/lib/utils";
import { FileCode2 } from "lucide-react";

export function TemplateModeToggle() {
  const templateMode = useEditorStore((s) => s.templateMode);
  const toggleTemplateMode = useEditorStore((s) => s.toggleTemplateMode);

  return (
    <button
      type="button"
      onClick={toggleTemplateMode}
      title={templateMode ? "ปิดโหมด Template" : "เปิดโหมด Template"}
      aria-label={templateMode ? "ปิดโหมด Template" : "เปิดโหมด Template"}
      aria-pressed={templateMode}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-1",
        templateMode
          ? "hover:brightness-95"
          : "bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-border)] hover:text-[color:var(--color-foreground)]"
      )}
      style={
        templateMode
          ? { backgroundColor: "#ffedd5", color: "#c2410c" }
          : undefined
      }
    >
      <FileCode2 className="size-3.5" />
      <span>โหมด Template</span>
    </button>
  );
}
