"use client";

import { useRef, useEffect, useState, useMemo, type ElementType } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { countWords, plainTextFromHtml } from "@/lib/text";
import { CLEANERS } from "@/types";
import { cn } from "@/lib/utils";
import { FileText, Type, Sparkles, AlignLeft, Ruler, Save, AlertTriangle } from "lucide-react";
import { countMissingFields, getMergeFieldStatuses } from "@/lib/placeholders";

function useDebouncedMemo<T>(factory: () => T, deps: React.DependencyList, delay = 300): T {
  const [value, setValue] = useState<T>(factory);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setValue(factory());
    }, delay);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}

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

export function StatusBar({
  rulerInfo,
  pageCount: pageCountProp = 1,
}: {
  rulerInfo?: { label: string } | null;
  pageCount?: number;
}) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const enabledCleaners = useEditorStore((s) => s.enabledCleaners);
  const history = useEditorStore((s) => s.history);
  const lastAction = useUiStore((s) => s.lastAction);
  const templateMode = useEditorStore((s) => s.templateMode);
  const previewMode = useEditorStore((s) => s.previewMode);
  const variables = useEditorStore((s) => s.variables);
  const dataSet = useEditorStore((s) => s.dataSet);
  const openPlaceholderPanel = useUiStore((s) => s.openPlaceholderPanel);

  const missingFieldCount = useMemo(() => {
    if (!templateMode || previewMode !== "preview") return 0;
    const dataRow = dataSet?.rows[dataSet.currentRowIndex] ?? {};
    const statuses = getMergeFieldStatuses(documentHtml, variables, dataRow, "preview");
    return countMissingFields(statuses);
  }, [templateMode, previewMode, documentHtml, variables, dataSet]);

  const words = useDebouncedMemo(() => countWords(documentHtml), [documentHtml], 300);
  const chars = useDebouncedMemo(() => plainTextFromHtml(documentHtml).length, [documentHtml], 300);

  const pageCount = Math.max(1, pageCountProp);
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
        {missingFieldCount > 0 && (
          <button
            type="button"
            onClick={openPlaceholderPanel}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-amber-700 hover:bg-amber-50"
            title="ตัวแปรที่ยังไม่มีค่า (Missing placeholders)"
          >
            <AlertTriangle className="size-3" />
            {missingFieldCount} ช่องว่าง
          </button>
        )}
        <span className="text-[color:var(--color-border-strong)]">
          {sizeLabel} · {orientationLabel}
        </span>
      </div>
    </div>
  );
}
