"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

import { useUiStore } from "@/store/uiStore";
import { useTemplateStore } from "@/store/templateStore";
import { Toast } from "./Toast";
import { DialogSystem } from "./DialogSystem";
import { useDraftRecovery } from "@/hooks/useDraftRecovery";
import type { Editor } from "@tiptap/react";
import { addEventListener, removeEventListener, EVENT_NAMES } from "@/lib/events";

const ExportDialog = dynamic(
  () => import("./ExportDialog").then((m) => m.ExportDialog),
  { ssr: false, loading: () => <DialogLoader label="กำลังโหลด Export…" /> }
);
const BatchUploadDialog = dynamic(
  () => import("./BatchUploadDialog").then((m) => m.BatchUploadDialog),
  { ssr: false, loading: () => <DialogLoader label="กำลังโหลด Batch…" /> }
);
const TemplatePanel = dynamic(
  () => import("./TemplatePanel").then((m) => m.TemplatePanel),
  { ssr: false, loading: () => <DialogLoader label="กำลังโหลด Template…" /> }
);
const SearchPanel = dynamic(
  () => import("./SearchPanel").then((m) => m.SearchPanel),
  { ssr: false, loading: () => <FloatingLoader label="กำลังโหลด Search…" /> }
);
const PageSetupDialog = dynamic(
  () => import("./PageSetupDialog").then((m) => m.PageSetupDialog),
  { ssr: false, loading: () => <DialogLoader label="กำลังโหลด Page setup…" /> }
);
const HeaderFooterDialog = dynamic(
  () => import("./HeaderFooterDialog").then((m) => m.HeaderFooterDialog),
  { ssr: false, loading: () => <DialogLoader label="กำลังโหลด Header/Footer…" /> }
);
const ShortcutsPanel = dynamic(
  () => import("./ShortcutsPanel").then((m) => m.ShortcutsPanel),
  { ssr: false, loading: () => <DialogLoader label="กำลังโหลด Shortcuts…" /> }
);
const TableOfContentsPanel = dynamic(
  () => import("./TableOfContentsPanel").then((m) => m.TableOfContentsPanel),
  { ssr: false, loading: () => <FloatingLoader label="กำลังโหลด TOC…" /> }
);
const RecoveryDialog = dynamic(
  () => import("./RecoveryDialog").then((m) => m.RecoveryDialog),
  { ssr: false, loading: () => <DialogLoader label="กำลังโหลด Recovery…" /> }
);
const CommandPalette = dynamic(
  () => import("./CommandPalette").then((m) => m.CommandPalette),
  { ssr: false, loading: () => <FloatingLoader label="กำลังโหลด Command…" /> }
);
const TemplateGalleryDialog = dynamic(
  () => import("./TemplateGalleryDialog").then((m) => m.TemplateGalleryDialog),
  { ssr: false, loading: () => <DialogLoader label="กำลังโหลด Gallery…" /> }
);

interface DialogManagerProps {
  editor: Editor | null;
}

function DialogLoader({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/25 backdrop-blur-[1px]">
      <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-4 py-2 text-xs text-[color:var(--color-muted-foreground)] shadow-lg">
        {label}
      </div>
    </div>
  );
}

function FloatingLoader({ label }: { label: string }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-xs text-[color:var(--color-muted-foreground)] shadow-lg">
      {label}
    </div>
  );
}

export function DialogManager({ editor }: DialogManagerProps) {
  const {
    recoveryOpen,
    pendingDraft,
    handleRestore,
    handleDiscard,
    handleOptOut,
  } = useDraftRecovery();

  const searchOpen = useUiStore((s) => s.searchOpen);
  const closeSearch = useUiStore((s) => s.closeSearch);
  const pageSetupOpen = useUiStore((s) => s.pageSetupOpen);
  const closePageSetup = useUiStore((s) => s.closePageSetup);
  const shortcutsOpen = useUiStore((s) => s.shortcutsOpen);
  const closeShortcuts = useUiStore((s) => s.closeShortcuts);
  const tocOpen = useUiStore((s) => s.tocOpen);
  const closeToc = useUiStore((s) => s.closeToc);
  const headerFooterOpen = useUiStore((s) => s.headerFooterOpen);
  const closeHeaderFooter = useUiStore((s) => s.closeHeaderFooter);

  const exportDialogOpen = useUiStore((s) => s.exportDialogOpen);
  const templateGalleryOpen = useUiStore((s) => s.templateGalleryOpen);
  const batchConvertOpen = useUiStore((s) => s.batchConvertOpen);
  const commandPaletteOpen = useUiStore((s) => s.commandPaletteOpen);
  const templatePanelOpen = useTemplateStore((s) => s.panelOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k" && !e.shiftKey) {
        const target = e.target as HTMLElement | null;
        if (
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        useUiStore.getState().openCommandPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const handler = () => {
      useUiStore.getState().openBatchConvert();
    };
    addEventListener(EVENT_NAMES.openBatchConvert, handler);
    return () => {
      removeEventListener(EVENT_NAMES.openBatchConvert, handler);
    };
  }, []);

  return (
    <>
      {recoveryOpen && (
        <RecoveryDialog
          open={recoveryOpen}
          draft={pendingDraft}
          onRestore={handleRestore}
          onDiscard={handleDiscard}
          onOptOut={handleOptOut}
        />
      )}
      {commandPaletteOpen && <CommandPalette editor={editor} />}
      {templateGalleryOpen && <TemplateGalleryDialog />}
      {exportDialogOpen && <ExportDialog />}
      <DialogSystem />
      {batchConvertOpen && <BatchUploadDialog />}
      {templatePanelOpen && <TemplatePanel />}
      <Toast />
      {searchOpen && (
        <SearchPanel editor={editor} open={searchOpen} onClose={closeSearch} />
      )}
      {pageSetupOpen && (
        <PageSetupDialog open={pageSetupOpen} onClose={closePageSetup} />
      )}
      {headerFooterOpen && (
        <HeaderFooterDialog open={headerFooterOpen} onClose={closeHeaderFooter} />
      )}
      {shortcutsOpen && (
        <ShortcutsPanel open={shortcutsOpen} onClose={closeShortcuts} />
      )}
      {tocOpen && (
        <TableOfContentsPanel editor={editor} open={tocOpen} onClose={closeToc} />
      )}
    </>
  );
}
