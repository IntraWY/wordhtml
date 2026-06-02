"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, RotateCcw, Eye, Check } from "lucide-react";

import { RibbonGroup } from "./RibbonGroup";
import { RibbonButton } from "./RibbonButton";
import { useEditorStore } from "@/store/editorStore";
import { useToastStore } from "@/store/toastStore";
import { useUiStore } from "@/store/uiStore";
import { applyCleaners } from "@/lib/cleaning/pipeline";
import { CLEANERS } from "@/types";
import { cn } from "@/lib/utils";
import { useCleanDocument } from "@/hooks/useCleanDocument";

const DEFAULT_CLEANERS = ["removeInlineStyles", "removeEmptyTags"] as const;

export function RibbonTabClean() {
  const enabledCleaners = useEditorStore((s) => s.enabledCleaners);
  const toggleCleaner = useEditorStore((s) => s.toggleCleaner);
  const hasDoc = useEditorStore((s) => s.documentHtml.trim().length > 0);

  const [isCleaning, setIsCleaning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const { cleanNow: handleCleanNowBase } = useCleanDocument();

  // Debounced preview computation — only runs when preview is visible,
  // and reads documentHtml from the store directly to avoid subscribing
  // to the full string (which changes on every keystroke).
  useEffect(() => {
    if (!showPreview) {
      const id = setTimeout(() => setPreviewHtml(""), 0);
      return () => clearTimeout(id);
    }
    const timer = setTimeout(() => {
      const html = useEditorStore.getState().documentHtml;
      const cleaners = useEditorStore.getState().enabledCleaners;
      setPreviewHtml(applyCleaners(html, cleaners));
    }, 300);
    return () => clearTimeout(timer);
  }, [showPreview, enabledCleaners]);

  const handleCleanNow = useCallback(async () => {
    const html = useEditorStore.getState().documentHtml;
    if (!html.trim()) {
      useToastStore.getState().show("ไม่มีเนื้อหาที่จะล้าง", "error");
      return;
    }
    setIsCleaning(true);

    const enabledCount = enabledCleaners.length;
    handleCleanNowBase({
      onCleaned: ({ removed }) => {
        const message =
          removed > 0
            ? `ล้างเสร็จแล้ว — ลบ ${removed.toLocaleString()} ตัวอักษร (${enabledCount} ตัวเลือก)`
            : `ล้างเสร็จแล้ว — ไม่มีการเปลี่ยนแปลง (${enabledCount} ตัวเลือก)`;
        useToastStore.getState().show(message, "success");
        useUiStore.getState().setLastAction(`ล้างเอกสาร — ลบ ${removed.toLocaleString()} ตัวอักษร`);
      },
    });

    setIsCleaning(false);
  }, [enabledCleaners, handleCleanNowBase]);

  const handleReset = useCallback(() => {
    DEFAULT_CLEANERS.forEach((key) => {
      if (!enabledCleaners.includes(key)) {
        useEditorStore.getState().toggleCleaner(key);
      }
    });
    // Disable any non-default cleaners
    enabledCleaners.forEach((key) => {
      if (!DEFAULT_CLEANERS.includes(key as (typeof DEFAULT_CLEANERS)[number])) {
        useEditorStore.getState().toggleCleaner(key);
      }
    });
    useToastStore.getState().show("รีเซ็ตตัวเลือกเป็นค่าเริ่มต้นแล้ว");
  }, [enabledCleaners]);

  return (
    <>
      <RibbonGroup label="การดำเนินการ">
        <button
          type="button"
          onClick={handleCleanNow}
          disabled={!hasDoc || isCleaning}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-white transition-all",
            "bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-hover)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-1",
            "disabled:pointer-events-none disabled:opacity-40"
          )}
        >
          <Sparkles className={cn("size-3.5", isCleaning && "animate-spin")} />
          {isCleaning ? "กำลังล้าง…" : "ล้างตอนนี้ (Clean Now)"}
        </button>

        <RibbonButton
          label={showPreview ? "ซ่อนตัวอย่าง" : "แสดงตัวอย่าง"}
          onClick={() => setShowPreview((p) => !p)}
          active={showPreview}
          disabled={!hasDoc}
        >
          <Eye className="size-3.5" />
        </RibbonButton>

        <RibbonButton label="รีเซ็ตตัวเลือก" onClick={handleReset}>
          <RotateCcw className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="ตัวเลือกการล้าง">
        {CLEANERS.map(({ key, label, description }) => {
          const enabled = enabledCleaners.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleCleaner(key)}
              title={description}
              aria-label={`${label}: ${description}`}
              aria-pressed={enabled}
              className={cn(
                "inline-flex cursor-pointer shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-1",
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
      </RibbonGroup>

      {showPreview && hasDoc && (
        <RibbonGroup label="ตัวอย่าง" className="flex-1">
          <div className="flex max-h-14 flex-1 gap-2 overflow-hidden">
            <div className="flex-1 overflow-auto rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[10px] text-[color:var(--color-muted-foreground)]">
              <div className="font-semibold text-[color:var(--color-foreground)]">ก่อน:</div>
              <div className="line-clamp-2">{useEditorStore.getState().documentHtml.slice(0, 300)}</div>
            </div>
            <div className="flex-1 overflow-auto rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-2 py-1 text-[10px] text-[color:var(--color-muted-foreground)]">
              <div className="font-semibold text-[color:var(--color-foreground)]">หลัง:</div>
              <div className="line-clamp-2">{previewHtml.slice(0, 300)}</div>
            </div>
          </div>
        </RibbonGroup>
      )}
    </>
  );
}
