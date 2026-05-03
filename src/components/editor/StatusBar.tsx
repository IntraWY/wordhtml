"use client";

import { useEditorStore } from "@/store/editorStore";
import { countWords, plainTextFromHtml } from "@/lib/text";
import { CLEANERS } from "@/types";
import { cn } from "@/lib/utils";
import { FileText, Type, Sparkles, AlignLeft } from "lucide-react";

interface StatusBarProps {
  pageCount: number;
}

export function StatusBar({ pageCount }: StatusBarProps) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const enabledCleaners = useEditorStore((s) => s.enabledCleaners);

  const words = countWords(documentHtml);
  const chars = plainTextFromHtml(documentHtml).length;
  const sizeLabel = pageSetup.size === "Letter" ? "Letter" : "A4";
  const orientationLabel =
    pageSetup.orientation === "landscape" ? "แนวนอน" : "แนวตั้ง";

  const cleanersLabel = `${enabledCleaners.length}/${CLEANERS.length} ตัวทำความสะอาด`;

  const Item = ({
    icon: Icon,
    label,
    value,
    className,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    className?: string;
  }) => (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        className
      )}
      title={label}
    >
      <Icon className="size-3 opacity-60" />
      <span>{value}</span>
    </span>
  );

  return (
    <div
      className="flex h-7 shrink-0 items-center justify-between border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-4 text-[11px] text-[color:var(--color-muted-foreground)]"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-4">
        <Item icon={FileText} label="จำนวนหน้า" value={`${pageCount} หน้า`} />
        <Item
          icon={Type}
          label="จำนวนคำ"
          value={`${words.toLocaleString()} คำ`}
        />
        <Item
          icon={AlignLeft}
          label="จำนวนตัวอักษร"
          value={`${chars.toLocaleString()} ตัวอักษร`}
        />
      </div>
      <div className="flex items-center gap-4">
        <Item
          icon={Sparkles}
          label="ตัวทำความสะอาด"
          value={cleanersLabel}
          className={enabledCleaners.length > 0 ? "text-[color:var(--color-accent)]" : ""}
        />
        <span className="text-[color:var(--color-border-strong)]">
          {sizeLabel} · {orientationLabel}
        </span>
      </div>
    </div>
  );
}
