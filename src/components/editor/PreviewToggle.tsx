"use client";

import { useEditorStore } from "@/store/editorStore";
import { cn } from "@/lib/utils";

export function PreviewToggle() {
  const templateMode = useEditorStore((s) => s.templateMode);
  const previewMode = useEditorStore((s) => s.previewMode);
  const setPreviewMode = useEditorStore((s) => s.setPreviewMode);

  if (!templateMode) return null;

  return (
    <div className="inline-flex rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)] p-0.5">
      <button
        type="button"
        onClick={() => setPreviewMode("edit")}
        className={cn(
          "rounded px-3 py-1 text-sm font-medium transition-colors",
          previewMode === "edit"
            ? "bg-white text-[color:var(--color-foreground)] shadow-sm"
            : "text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        )}
      >
        แก้ไข (Edit)
      </button>
      <button
        type="button"
        onClick={() => setPreviewMode("preview")}
        className={cn(
          "rounded px-3 py-1 text-sm font-medium transition-colors",
          previewMode === "preview"
            ? "bg-white text-[color:var(--color-foreground)] shadow-sm"
            : "text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
        )}
      >
        ดูตัวอย่าง (Preview)
      </button>
    </div>
  );
}
