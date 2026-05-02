"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ProcessedContent } from "./ProcessedContent";
import type { PageSetup } from "@/store/editorStore";

interface MultiPagePreviewProps {
  html: string;
  pageSetup: PageSetup;
  className?: string;
}

const PAGE_BREAK_REGEX = /<div[^>]*\bpage-break\b[^>]*>\s*<\/div>/gi;

export function MultiPagePreview({ html, pageSetup, className }: MultiPagePreviewProps) {
  const pages = useMemo(() => {
    const segments = html.split(PAGE_BREAK_REGEX);
    const filtered = segments.filter(
      (segment, _index, arr) => segment.trim().length > 0 || arr.length === 1
    );
    return filtered.length > 0 ? filtered : [""];
  }, [html]);

  return (
    <div className={cn("flex flex-col items-center gap-8 py-8", className)}>
      {pages.map((pageHtml, index) => (
        <div key={index} className="relative">
          <ProcessedContent
            html={pageHtml}
            pageSetup={pageSetup}
            className="overflow-hidden"
            exactHeight
          />
          <div className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[11px] text-[color:var(--color-muted-foreground)]">
            {index + 1}
          </div>
        </div>
      ))}
    </div>
  );
}
