"use client";

import { useEditorStore } from "@/store/editorStore";

export function SourcePane() {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const setHtml = useEditorStore((s) => s.setHtml);
  return (
    <div className="flex flex-col overflow-hidden bg-[color:var(--color-background)]">
      <div
        id="source-pane-label"
        className="shrink-0 border-b border-[color:var(--color-border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]"
      >
        ซอร์ส HTML
      </div>
      <textarea
        aria-label="ซอร์ส HTML"
        aria-labelledby="source-pane-label"
        className="flex-1 resize-none p-4 font-mono text-xs leading-relaxed text-[color:var(--color-foreground)] outline-none"
        value={documentHtml}
        onChange={(e) => setHtml(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
