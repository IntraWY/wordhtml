"use client";

import { useMemo, type ElementType } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { usePaginationStore } from "@/store/paginationStore";
import { countWords, plainTextFromHtml } from "@/lib/text";
import { CLEANERS } from "@/types";
import { cn } from "@/lib/utils";
import { FileText, Type, Sparkles, AlignLeft, Ruler, Save } from "lucide-react";

interface StatusItemProps {
  icon: ElementType;
  label: string;
  value: string | number;
  className?: string;
}

function StatusItem({ icon: Icon, label, value, className }: StatusItemProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={label}
    >
      <Icon className="size-3 opacity-60" />
      <span>{value}</span>
    </span>
  );
}

export function StatusBar({ rulerInfo }: { rulerInfo?: { label: string } | null }) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const enabledCleaners = useEditorStore((s) => s.enabledCleaners);
  const history = useEditorStore((s) => s.history);
  const lastAction = useUiStore((s) => s.lastAction);

  const words = useMemo(() => countWords(documentHtml), [documentHtml]);
  const chars = useMemo(() => plainTextFromHtml(documentHtml).length, [documentHtml]);

  // Use pagination store when available; fall back to manual page-break counting.
  const storeTotalPages = usePaginationStore((s) => s.totalPages);
  const manualBreaks = useMemo(() => {
    if (!documentHtml) return 0;
    return (documentHtml.match(/<div[^>]*\sclass=["'][^"']*\bpage-break\b[^"']*["'][^>]*>/gi) || []).length;
  }, [documentHtml]);
  const manualPageCount = manualBreaks + 1;
  const pageCount = storeTotalPages > 1 ? storeTotalPages : manualPageCount;
  const sizeLabel = pageSetup.size === "Letter" ? "Letter" : "A4";
  const orientationLabel =
    pageSetup.orientation === "landscape" ? "แนวนอน" : "แนวตั้ง";

  const cleanersLabel = `${enabledCleaners.length}/${CLEANERS.length} ตัวทำความสะอาด`;

  const lastSnapshotHtml = history[0]?.html ?? "";
  const isModified = documentHtml.trim().length > 0 && documentHtml !== lastSnapshotHtml;
  const isSaved = documentHtml.trim().length > 0 && !isModified;

  return (
    <div
      className="flex h-7 shrink-0 items-center justify-between border-t border-[color:var(--color-border)] bg-white/80 px-4 text-[11px] text-[color:var(--color-muted-foreground)] backdrop-blur"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-4">
        <StatusItem icon={FileText} label="จำนวนหน้า (Pages)" value={`${pageCount} หน้า`} />
        <StatusItem
          icon={Type}
          label="จำนวนคำ (Words)"
          value={`${words.toLocaleString()} คำ`}
        />
        <StatusItem
          icon={AlignLeft}
          label="จำนวนตัวอักษร (Characters)"
          value={`${chars.toLocaleString()} ตัวอักษร`}
        />
      </div>
      <div className="flex items-center gap-4">
        {rulerInfo && (
          <span className="inline-flex items-center gap-1.5 text-[color:var(--color-accent)]">
            <Ruler className="size-3 opacity-60" />
            <span>{rulerInfo.label}</span>
          </span>
        )}
        <StatusItem
          icon={Sparkles}
          label="ตัวทำความสะอาด"
          value={cleanersLabel}
          className={enabledCleaners.length > 0 ? "text-[color:var(--color-accent)]" : ""}
        />
        {lastAction && (
          <span className="inline-flex items-center gap-1 text-[color:var(--color-muted-foreground)]">
            <Save className="size-3 opacity-60" />
            {lastAction}
          </span>
        )}
        {isSaved && (
          <span className="inline-flex items-center gap-1 text-emerald-600" title="บันทึกแล้ว (Saved)">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            บันทึกแล้ว (Saved)
          </span>
        )}
        {isModified && (
          <span className="inline-flex items-center gap-1 text-amber-600" title="มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก (Unsaved changes)">
            <span className="size-1.5 rounded-full bg-amber-500" />
            ยังไม่บันทึก (Unsaved)
          </span>
        )}
        <span className="text-[color:var(--color-border-strong)]">
          {sizeLabel} · {orientationLabel}
        </span>
      </div>
    </div>
  );
}
