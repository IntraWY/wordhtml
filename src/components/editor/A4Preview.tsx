"use client";

import { useEditorStore } from "@/store/editorStore";

export function A4Preview() {
  const documentHtml = useEditorStore((s) => s.documentHtml);

  return (
    <div className="flex h-full flex-col bg-zinc-100">
      <div className="shrink-0 border-b border-[color:var(--color-border)] bg-[color:var(--color-background)] px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
        A4 preview
      </div>
      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto w-full max-w-[794px]">
          {/* A4 paper at ~96dpi: 794 × 1123 px = aspect ratio 0.707 */}
          <article
            className="paper mx-auto min-h-[1123px] w-full bg-white px-[72px] py-[80px] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)]"
            // The user-provided HTML is already from their own paste/edit flow.
            // It is sanitized at the conversion boundary (paste handler / mammoth output).
            dangerouslySetInnerHTML={{
              __html: documentHtml || PLACEHOLDER_HTML,
            }}
          />
        </div>
      </div>
    </div>
  );
}

const PLACEHOLDER_HTML = `
  <p style="color:#a1a1aa;font-style:italic;">
    The A4 preview renders your edited document at print scale.
    Start typing, paste from Word, or upload a .docx to fill this page.
  </p>
`;
