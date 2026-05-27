"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BookmarkPlus, FileText, Pencil, Trash2, X, Download, Upload, Loader2 } from "lucide-react";

import { useEditorStore } from "@/store/editorStore";
import type { PageSetup } from "@/types";
import { useTemplateStore, exportAllTemplates, parseTemplateExport } from "@/store/templateStore";
import { useToastStore } from "@/store/toastStore";
import { useDialogStore } from "@/store/dialogStore";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { exportAllSettings, importAllSettings } from "@/lib/settingsExport";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TemplatePanel() {
  const open = useTemplateStore((s) => s.panelOpen);
  const closePanel = useTemplateStore((s) => s.closePanel);
  const templates = useTemplateStore((s) => s.templates);
  const loading = useTemplateStore((s) => s.loading);
  const error = useTemplateStore((s) => s.error);
  const saveTemplate = useTemplateStore((s) => s.saveTemplate);
  const renameTemplate = useTemplateStore((s) => s.renameTemplate);
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate);
  const importTemplates = useTemplateStore((s) => s.importTemplates);

  const documentHtml = useEditorStore((s) => s.documentHtml);
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const setHtml = useEditorStore((s) => s.setHtml);
  const setPageSetup = useEditorStore((s) => s.setPageSetup);
  const setFileName = useEditorStore((s) => s.setFileName);
  const clearError = useEditorStore((s) => s.clearError);
  const clearLoadWarnings = useEditorStore((s) => s.clearLoadWarnings);

  const [saveName, setSaveName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const hasDoc = documentHtml.trim().length > 0;

  function handleLoad(id: string) {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    if (hasDoc) {
      const { openConfirm } = useDialogStore.getState();
      openConfirm(
        "โหลด Template (Load Template)",
        "โหลด template จะแทนที่เอกสารปัจจุบัน — ดำเนินการต่อไหม?",
        () => {
          doLoad(template);
        }
      );
    } else {
      doLoad(template);
    }
  }

  function doLoad(template: typeof templates[0]) {
    setHtml(sanitizeHtml(template.html));
    setPageSetup(template.pageSetup);
    setFileName(template.name);
    clearError();
    clearLoadWarnings();
    closePanel();
    useToastStore.getState().show(`โหลด Template: ${template.name} แล้ว`);
  }

  async function handleSave() {
    const name = saveName.trim();
    if (!name || !hasDoc) return;
    setActionLoading("save");
    try {
      await saveTemplate(name, documentHtml, pageSetup);
      setSaveName("");
      useToastStore.getState().show(`บันทึก Template "${name}" แล้ว`);
    } catch {
      useToastStore.getState().show("บันทึก Template ไม่สำเร็จ", "error");
    } finally {
      setActionLoading(null);
    }
  }

  function handleRenameStart(id: string, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName);
  }

  async function handleRenameCommit(id: string) {
    const name = renameValue.trim();
    if (!name) {
      setRenamingId(null);
      return;
    }
    setActionLoading(`rename-${id}`);
    try {
      await renameTemplate(id, name);
    } catch {
      useToastStore.getState().show("เปลี่ยนชื่อไม่สำเร็จ", "error");
    } finally {
      setActionLoading(null);
      setRenamingId(null);
    }
  }

  function handleRenameAbort() {
    setRenamingId(null);
  }

  function handleExport() {
    if (templates.length === 0) {
      useToastStore.getState().show("ไม่มี template ให้ส่งออก", "error");
      return;
    }
    exportAllTemplates(templates);
    useToastStore.getState().show(`ส่งออก template ${templates.length} รายการแล้ว`);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading("import");
    try {
      const text = await file.text();
      const items = parseTemplateExport(text);
      if (!items || items.length === 0) {
        useToastStore.getState().show("ไฟล์ไม่ถูกต้องหรือไม่มี template", "error");
        return;
      }
      const imported = await importTemplates(items);
      useToastStore.getState().show(`นำเข้า template ${imported} รายการแล้ว`);
    } catch {
      useToastStore.getState().show("อ่านไฟล์ไม่สำเร็จ", "error");
    } finally {
      setActionLoading(null);
      e.target.value = "";
    }
  }

  async function handleBackup() {
    setActionLoading("backup");
    try {
      const blob = exportAllSettings();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wordhtml-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      useToastStore.getState().show("สำรองข้อมูลทั้งหมดแล้ว");
    } catch {
      useToastStore.getState().show("สำรองข้อมูลไม่สำเร็จ", "error");
    } finally {
      setActionLoading(null);
    }
  }

  function handleRestoreClick() {
    restoreInputRef.current?.click();
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading("restore");
    try {
      await importAllSettings(file);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "กู้คืนข้อมูลไม่สำเร็จ";
      useToastStore.getState().show(message, "error");
    } finally {
      setActionLoading(null);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string, name: string) {
    setActionLoading(`delete-${id}`);
    try {
      await deleteTemplate(id);
      useToastStore.getState().show(`ลบ Template "${name}" แล้ว`);
    } catch {
      useToastStore.getState().show("ลบ Template ไม่สำเร็จ", "error");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setRenamingId(null);
          setSaveName("");
          closePanel();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex w-[min(560px,92vw)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-[color:var(--color-muted-foreground)]" />
              <Dialog.Title className="text-base font-semibold tracking-tight">
                Template ของฉัน
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                จัดการ template เอกสารที่บันทึกไว้
              </Dialog.Description>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleExport}
                disabled={actionLoading === "export" || templates.length === 0}
                title="ส่งออกทั้งหมดเป็นไฟล์ JSON"
                className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] disabled:opacity-40"
              >
                {actionLoading === "export" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                disabled={actionLoading === "import"}
                title="นำเข้าจากไฟล์ JSON"
                className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)] disabled:opacity-40"
              >
                {actionLoading === "import" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
              <Dialog.Close
                aria-label="ปิด"
                className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Loader2 className="size-8 animate-spin text-[color:var(--color-muted-foreground)]" />
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  กำลังโหลด Templates...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <FileText className="size-10 text-[color:var(--color-border-strong)]" />
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  ยังไม่มี Template
                </p>
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  บันทึกเอกสารปัจจุบันเป็น Template ด้านล่าง
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[color:var(--color-border)]">
                {templates.map((t) => (
                  <TemplateRow
                    key={t.id}
                    name={t.name}
                    createdAt={t.createdAt}
                    pageSize={t.pageSetup.size}
                    isRenaming={renamingId === t.id}
                    renameValue={renameValue}
                    actionLoading={actionLoading}
                    onRenameValueChange={setRenameValue}
                    onLoad={() => handleLoad(t.id)}
                    onRenameStart={() => handleRenameStart(t.id, t.name)}
                    onRenameCommit={() => handleRenameCommit(t.id)}
                    onRenameAbort={handleRenameAbort}
                    onDelete={() => {
                      const { openConfirm } = useDialogStore.getState();
                      openConfirm(
                        "ลบ Template (Delete Template)",
                        `ลบ template "${t.name}" — ไม่สามารถกู้คืนได้?`,
                        () => handleDelete(t.id, t.name)
                      );
                    }}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="shrink-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6 py-4 space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-muted-foreground)]">
                สำรอง/กู้คืนข้อมูลทั้งหมด (Backup/Restore)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBackup}
                  disabled={actionLoading === "backup"}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)] disabled:opacity-40"
                >
                  {actionLoading === "backup" ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  สำรองข้อมูลทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={handleRestoreClick}
                  disabled={actionLoading === "restore"}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)] disabled:opacity-40"
                >
                  {actionLoading === "restore" ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  กู้คืนข้อมูลทั้งหมด
                </button>
                <input
                  ref={restoreInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleRestoreFile}
                  className="hidden"
                />
              </div>
            </div>
            <div className="border-t border-[color:var(--color-border)] pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-muted-foreground)]">
                บันทึกเอกสารปัจจุบันเป็น Template
              </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="ตั้งชื่อ template…"
                className="flex-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-foreground)]"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!saveName.trim() || !hasDoc || actionLoading === "save"}
                className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-foreground)] px-4 py-2 text-sm font-medium text-[color:var(--color-background)] transition-colors disabled:opacity-40"
              >
                {actionLoading === "save" ? <Loader2 className="size-3.5 animate-spin" /> : <BookmarkPlus className="size-3.5" />}
                บันทึก
              </button>
            </div>
            {!hasDoc && (
              <p className="mt-1.5 text-[11px] text-[color:var(--color-muted-foreground)]">
                เปิดหรือสร้างเอกสารก่อนบันทึก template
              </p>
            )}
            <p className="mt-3 text-[11px] text-[color:var(--color-muted-foreground)]">
              Templates ซิงก์ผ่าน Firebase (เมื่อ deploy ตั้งค่าแล้ว) — ต่างจากประวัติ (History)
              ที่เก็บในเครื่องเท่านั้น
            </p>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface TemplateRowProps {
  name: string;
  createdAt: string;
  pageSize: PageSetup["size"];
  isRenaming: boolean;
  renameValue: string;
  actionLoading: string | null;
  onRenameValueChange: (v: string) => void;
  onLoad: () => void;
  onRenameStart: () => void;
  onRenameCommit: () => void;
  onRenameAbort: () => void;
  onDelete: () => void;
}

function TemplateRow({
  name,
  createdAt,
  pageSize,
  isRenaming,
  renameValue,
  actionLoading,
  onRenameValueChange,
  onLoad,
  onRenameStart,
  onRenameCommit,
  onRenameAbort,
  onDelete,
}: TemplateRowProps) {
  const isLoading = actionLoading?.startsWith("delete-") || actionLoading?.startsWith("rename-");

  return (
    <li className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[color:var(--color-muted)] focus-within:bg-[color:var(--color-muted)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-foreground)] text-[10px] font-bold text-[color:var(--color-background)]">
        {pageSize === "A4" ? "A4" : "Ltr"}
      </div>

      <div className="min-w-0 flex-1">
        {isRenaming ? (
          <input
            autoFocus
            type="text"
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRenameCommit();
              }
              if (e.key === "Escape") {
                onRenameAbort();
              }
            }}
            className="w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-0.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[color:var(--color-foreground)]"
          />
        ) : (
          <button
            type="button"
            onClick={onLoad}
            disabled={isLoading}
            className="block w-full truncate text-left text-sm font-medium hover:underline disabled:opacity-50"
          >
            {name}
          </button>
        )}
        <p className="mt-0.5 text-xs text-[color:var(--color-muted-foreground)]">
          {formatDate(createdAt)}
        </p>
      </div>

      {!isRenaming && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <RowBtn label="เปลี่ยนชื่อ" onClick={onRenameStart}>
            <Pencil className="size-3.5" />
          </RowBtn>
          <RowBtn label="ลบ" onClick={onDelete} danger>
            <Trash2 className="size-3.5" />
          </RowBtn>
        </div>
      )}
    </li>
  );
}

interface RowBtnProps {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}

function RowBtn({ label, onClick, danger, children }: RowBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md transition-colors",
        danger
          ? "text-[color:var(--color-muted-foreground)] hover:bg-red-100 hover:text-red-600"
          : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-border)] hover:text-[color:var(--color-foreground)]"
      )}
    >
      {children}
    </button>
  );
}
