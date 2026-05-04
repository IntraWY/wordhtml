"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BookmarkPlus, FileText, Pencil, Trash2, X, Download, Upload } from "lucide-react";

import { useEditorStore, type PageSetup } from "@/store/editorStore";
import { useTemplateStore, exportAllTemplates, parseTemplateExport } from "@/store/templateStore";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/utils";

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
  // Single renameValue shared across rows — only one row renames at a time via renamingId.
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasDoc = documentHtml.trim().length > 0;

  function handleLoad(id: string) {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    if (
      hasDoc &&
      !window.confirm(
        "โหลด template จะแทนที่เอกสารปัจจุบัน — ดำเนินการต่อไหม?"
      )
    ) {
      return;
    }
    setHtml(template.html);
    setPageSetup(template.pageSetup);
    setFileName(template.name);
    clearError();
    clearLoadWarnings();
    closePanel();
    useToastStore.getState().show(`โหลด Template: ${template.name} แล้ว`);
  }

  function handleSave() {
    const name = saveName.trim();
    if (!name || !hasDoc) return;
    saveTemplate(name, documentHtml, pageSetup);
    setSaveName("");
    useToastStore.getState().show(`บันทึก Template "${name}" แล้ว`);
  }

  function handleRenameStart(id: string, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName);
  }

  function handleRenameCommit(id: string) {
    const name = renameValue.trim();
    if (name) renameTemplate(id, name);
    setRenamingId(null);
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
    try {
      const text = await file.text();
      const items = parseTemplateExport(text);
      if (!items || items.length === 0) {
        useToastStore.getState().show("ไฟล์ไม่ถูกต้องหรือไม่มี template", "error");
        return;
      }
      const imported = importTemplates(items);
      useToastStore.getState().show(`นำเข้า template ${imported} รายการแล้ว`);
    } catch {
      useToastStore.getState().show("อ่านไฟล์ไม่สำเร็จ", "error");
    } finally {
      // reset input so same file can be selected again
      e.target.value = "";
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
                title="ส่งออกทั้งหมดเป็นไฟล์ JSON"
                className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              >
                <Download className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                title="นำเข้าจากไฟล์ JSON"
                className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              >
                <Upload className="size-4" />
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
            {templates.length === 0 ? (
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
                    onRenameValueChange={setRenameValue}
                    onLoad={() => handleLoad(t.id)}
                    onRenameStart={() => handleRenameStart(t.id, t.name)}
                    onRenameCommit={() => handleRenameCommit(t.id)}
                    onRenameAbort={handleRenameAbort}
                    onDelete={() => {
                      if (window.confirm(`ลบ template "${t.name}" — ไม่สามารถกู้คืนได้?`)) {
                        deleteTemplate(t.id);
                        useToastStore.getState().show(`ลบ Template "${t.name}" แล้ว`);
                      }
                    }}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="shrink-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6 py-4">
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
                disabled={!saveName.trim() || !hasDoc}
                className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-foreground)] px-4 py-2 text-sm font-medium text-[color:var(--color-background)] transition-colors disabled:opacity-40"
              >
                <BookmarkPlus className="size-3.5" />
                บันทึก
              </button>
            </div>
            {!hasDoc && (
              <p className="mt-1.5 text-[11px] text-[color:var(--color-muted-foreground)]">
                เปิดหรือสร้างเอกสารก่อนบันทึก template
              </p>
            )}
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
  onRenameValueChange,
  onLoad,
  onRenameStart,
  onRenameCommit,
  onRenameAbort,
  onDelete,
}: TemplateRowProps) {
  // Tracks whether Escape was pressed so onBlur doesn't commit after abort.
  const keyHandledRef = useRef(false);

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
                keyHandledRef.current = true;
                onRenameCommit();
              }
              if (e.key === "Escape") {
                keyHandledRef.current = true;
                onRenameAbort();
              }
            }}
            onBlur={() => {
              if (!keyHandledRef.current) onRenameCommit();
              keyHandledRef.current = false;
            }}
            className="w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-0.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[color:var(--color-foreground)]"
          />
        ) : (
          <button
            type="button"
            onClick={onLoad}
            className="block w-full truncate text-left text-sm font-medium hover:underline"
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
// force rebuild 2026-05-04T16:56:07.9769045+07:00
