"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  Clock,
  Bookmark,
  Save,
  Layers,
  LayoutTemplate,
  FolderOpen,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/BrandLogo";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UploadButton } from "./UploadButton";
import { AuthButton } from "./AuthButton";
import { CloudSyncIndicator } from "./CloudSyncIndicator";
import { useAuthStore } from "@/store/authStore";
import { isFirebaseConfigured } from "@/lib/firebaseConfig";
import { cn } from "@/lib/utils";
import { dispatchOpenTemplates, dispatchOpenBatchConvert } from "@/lib/events";

const HistoryPanel = dynamic(
  () => import("./HistoryPanel").then((m) => m.HistoryPanel),
  { ssr: false, loading: () => null }
);

/**
 * "เอกสาร (Documents)" dropdown — groups the document-management actions
 * (history, template gallery, my templates, batch convert) under one trigger
 * so the TopBar keeps only Save + Export as persistent primary controls.
 * Self-contained popover: click-outside + Escape close, no extra dependency.
 */
function DocumentsMenu({ historyCount }: { historyCount: number }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: {
    icon: typeof Clock;
    label: string;
    onClick: () => void;
    badge?: number;
  }[] = [
    {
      icon: Clock,
      label: "ประวัติ (History)",
      onClick: () => useUiStore.getState().openHistoryPanel(),
      badge: historyCount,
    },
    {
      icon: LayoutTemplate,
      label: "แกลเลอรี (Gallery)",
      onClick: () => useUiStore.getState().openTemplateGallery(),
    },
    {
      icon: Bookmark,
      label: "Template ของฉัน (My templates)",
      onClick: dispatchOpenTemplates,
    },
    {
      icon: Layers,
      label: "แปลงเป็นกลุ่ม (Batch)",
      onClick: dispatchOpenBatchConvert,
    },
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="เอกสาร (Documents)"
        className={cn(
          "relative inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
          open && "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)]"
        )}
      >
        <FolderOpen className="size-4" />
        <span className="hidden md:inline">เอกสาร</span>
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
        {historyCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--color-accent)] text-[9px] font-bold text-[color:var(--color-accent-foreground)]"
            aria-label={`จำนวนเอกสาร (Document count) ${historyCount}`}
          >
            {historyCount > 9 ? "9+" : historyCount}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-56 overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] py-1 shadow-lg"
        >
          {items.map(({ icon: Icon, label, onClick, badge }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => {
                onClick();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
            >
              <Icon className="size-4 shrink-0 text-[color:var(--color-muted-foreground)]" />
              <span className="flex-1">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="rounded-full bg-[color:color-mix(in_srgb,var(--color-accent)_14%,transparent)] px-1.5 text-[10px] font-semibold text-[color:var(--color-accent)]">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const enabledCleaners = useEditorStore((s) => s.enabledCleaners);
  const prepareExport = useEditorStore((s) => s.prepareExport);
  const saveSnapshot = useEditorStore((s) => s.saveSnapshot);
  const historyPanelOpen = useUiStore((s) => s.historyPanelOpen);
  const openExportDialog = useUiStore((s) => s.openExportDialog);
  const fileName = useEditorStore((s) => s.fileName);
  const hasDoc = useEditorStore((s) => s.documentHtml.length > 0);
  const historyCount = useEditorStore((s) => s.history.length);
  const signedIn = useAuthStore((s) => Boolean(s.user));

  const saveTitle = signedIn
    ? "บันทึกเอกสาร + ซิงก์ขึ้นคลาวด์ (Save + cloud sync)"
    : isFirebaseConfigured()
      ? "บันทึกเอกสารในเครื่อง — ลงชื่อเข้าใช้เพื่อซิงก์คลาวด์ (Save; sign in to sync)"
      : "บันทึกเอกสาร (เปิดใหม่แล้วกลับมาอัตโนมัติ) — Save document";

  return (
    <>
      <header
        data-tour="welcome"
        className="flex h-14 shrink-0 items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5"
      >
        <div className="flex items-center gap-3">
          <BrandLogo showVersion />
          {fileName && (
            <>
              <span className="text-[color:var(--color-border-strong)]">/</span>
              <span className="max-w-xs truncate text-sm text-[color:var(--color-muted-foreground)]">
                {fileName}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <AuthButton />
          <ThemeToggle />
          <DocumentsMenu historyCount={historyCount} />
          <UploadButton />
          <CloudSyncIndicator compact className="mx-0.5" />
          <button
            type="button"
            onClick={() => saveSnapshot()}
            disabled={!hasDoc}
            title={saveTitle}
            aria-label={saveTitle}
            className="inline-flex h-8 w-8 md:w-auto items-center justify-center gap-1.5 rounded-md px-0 md:px-2.5 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] disabled:opacity-40"
          >
            <Save className="size-4" />
            <span className="hidden md:inline text-sm">บันทึก</span>
          </button>
          <Button
            data-tour="export"
            size="sm"
            className="bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)] shadow-sm transition-shadow hover:bg-[color:var(--color-accent-hover)] hover:shadow-md"
            onClick={() => {
              prepareExport();
              openExportDialog();
            }}
            disabled={!hasDoc}
            aria-label={`ส่งออก HTML พร้อมตัวทำความสะอาด ${enabledCleaners.length} รายการ`}
          >
            <Download />
            ส่งออก HTML
            {enabledCleaners.length > 0 && (
              <span
                className="ml-1 rounded-full bg-[color:var(--color-accent-foreground)]/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                aria-label={`ตัวทำความสะอาดที่เปิดใช้งาน (Active cleaners) ${enabledCleaners.length}`}
              >
                {enabledCleaners.length}
              </span>
            )}
          </Button>
        </div>
      </header>
      {historyPanelOpen && <HistoryPanel />}
    </>
  );
}
