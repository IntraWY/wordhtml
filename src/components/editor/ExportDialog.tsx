"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  FileCode2,
  FileArchive,
  FileText,
  FileType2,
  FileDown,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { useToastStore } from "@/store/toastStore";
import { applyCleaners } from "@/lib/cleaning/pipeline";
import { downloadHtml } from "@/lib/export/exportHtml";
import { downloadZip } from "@/lib/export/exportZip";
import { downloadDocx } from "@/lib/export/exportDocx";
import { exportMarkdown } from "@/lib/export/exportMarkdown";
import { exportPdf } from "@/lib/export/exportPdf";
import { generateGASFunction } from "@/lib/gasGenerator";
import type { ExportFormat, ImageMode } from "@/types";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { resolveHtmlPlaceholders } from "@/lib/placeholders";
import { checkExportHealth } from "@/lib/export/exportHealthCheck";
import { inlinePlaceholderFields } from "@/lib/export/inlinePlaceholderFields";

type ExportKind = ExportFormat;

type ExportTab = "file" | "preview" | "gas";

export function ExportDialog() {
  const open = useUiStore((s) => s.exportDialogOpen);
  const close = useUiStore((s) => s.closeExportDialog);
  const imageMode = useEditorStore((s) => s.imageMode);
  const setImageMode = useEditorStore((s) => s.setImageMode);
  const fileName = useEditorStore((s) => s.fileName);
  const pendingFormat = useEditorStore((s) => s.pendingExportFormat);
  const setPendingExportFormat = useEditorStore(
    (s) => s.setPendingExportFormat
  );
  const templateMode = useEditorStore((s) => s.templateMode);
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const enabledCleaners = useEditorStore((s) => s.enabledCleaners);
  const variables = useEditorStore((s) => s.variables);
  const dataSet = useEditorStore((s) => s.dataSet);
  const previewMode = useEditorStore((s) => s.previewMode);
  const exportMissingPolicy = useEditorStore((s) => s.exportMissingPolicy);
  const setExportMissingPolicy = useEditorStore((s) => s.setExportMissingPolicy);
  const fieldValues = useEditorStore((s) => s.fieldValues);

  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [copied, setCopied] = useState(false);
  const [gasCopied, setGasCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ExportTab>("file");
  const effectiveTab: ExportTab =
    activeTab === "gas" && !templateMode ? "file" : activeTab;
  const [gasFunctionName, setGasFunctionName] = useState("generateDocument");
  const [includeSheetIntegration, setIncludeSheetIntegration] = useState(true);

  const selectedFormat = pendingFormat ?? "html";

  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  const cleanedHtml = useMemo(() => {
    if (!open) return "";
    let html = applyCleaners(documentHtml, enabledCleaners);
    html = inlinePlaceholderFields(html, fieldValues);
    if (templateMode) {
      const dataRow = dataSet?.rows[dataSet.currentRowIndex] ?? {};
      html = resolveHtmlPlaceholders(html, {
        mode: "export",
        variables,
        dataRow,
        missingPolicy: exportMissingPolicy,
      });
    }
    return html;
  }, [
    open,
    documentHtml,
    enabledCleaners,
    fieldValues,
    templateMode,
    variables,
    dataSet,
    exportMissingPolicy,
  ]);

  const exportHealthIssues = useMemo(() => {
    if (!open) return [];
    return checkExportHealth({
      documentHtml,
      variables,
      dataRow: dataSet?.rows[dataSet.currentRowIndex] ?? {},
      templateMode,
      previewMode,
    });
  }, [open, documentHtml, variables, dataSet, templateMode, previewMode]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  useEffect(() => {
    if (!gasCopied) return;
    const id = setTimeout(() => setGasCopied(false), 1500);
    return () => clearTimeout(id);
  }, [gasCopied]);

  useEffect(() => {
    if (open && primaryBtnRef.current) {
      const id = setTimeout(() => primaryBtnRef.current?.focus(), 60);
      return () => clearTimeout(id);
    }
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanedHtml);
      setCopied(true);
    } catch {
      useToastStore.getState().show("ไม่สามารถคัดลอกได้ — เบราว์เซอร์ไม่อนุญาต", "error");
    }
  };

  const gasCode = useMemo(() => {
    if (!open || !templateMode) return "";
    return generateGASFunction(documentHtml, variables, {
      functionName: gasFunctionName,
      includeGenerateFunction: true,
      includeSheetIntegration,
    }).code;
  }, [open, templateMode, gasFunctionName, includeSheetIntegration, documentHtml, variables]);

  const handleCopyGAS = async () => {
    try {
      await navigator.clipboard.writeText(gasCode);
      setGasCopied(true);
    } catch {
      useToastStore.getState().show("ไม่สามารถคัดลอกได้ — เบราว์เซอร์ไม่อนุญาต", "error");
    }
  };

  const pageSetup = useEditorStore((s) => s.pageSetup);

  const handleDownload = async (kind: ExportKind) => {
    if (busy) return;
    const blocking = exportHealthIssues.find((i) => i.severity === "error");
    if (blocking) {
      useToastStore.getState().show(blocking.message, "error");
      return;
    }
    setBusy(kind);
    try {
      const exportOpts = {
        sourceName: fileName,
        title: fileName?.replace(/\.[^.]+$/, "") ?? "Document",
        pageSetup,
      };
      if (kind === "html") {
        if (imageMode === "separate") {
          await downloadZip(cleanedHtml, exportOpts);
        } else {
          downloadHtml(cleanedHtml, exportOpts);
        }
      } else if (kind === "zip") {
        await downloadZip(cleanedHtml, exportOpts);
      } else if (kind === "md") {
        await exportMarkdown(cleanedHtml, fileName);
      } else if (kind === "pdf") {
        await exportPdf(cleanedHtml, {
          sourceName: fileName,
          pageSetup,
        });
      } else {
        await downloadDocx(cleanedHtml, exportOpts);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ส่งออกไม่สำเร็จ";
      useToastStore.getState().show(message, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            primaryBtnRef.current?.focus();
          }}
          className="fixed left-1/2 top-1/2 z-50 grid w-[min(900px,92vw)] max-h-[88vh] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]"
        >
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight">
                ส่งออก (Export)
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                ตัวเลือกการส่งออกเอกสารและโค้ด
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="ปิด"
              className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          {/* Tabs */}
          <div className="flex shrink-0 border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6" role="tablist" aria-label="ตัวเลือกการส่งออก">
            <button
              type="button"
              id="export-tab-btn-file"
              role="tab"
              aria-selected={effectiveTab === "file"}
              tabIndex={effectiveTab === "file" ? 0 : -1}
              onClick={() => setActiveTab("file")}
              className={cn(
                "relative px-4 py-2.5 text-xs font-medium transition-colors",
                effectiveTab === "file"
                  ? "text-[color:var(--color-foreground)]"
                  : "text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
              )}
            >
              ไฟล์ (File)
              {effectiveTab === "file" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--color-foreground)]" />
              )}
            </button>
            <button
              type="button"
              id="export-tab-btn-preview"
              role="tab"
              aria-selected={effectiveTab === "preview"}
              tabIndex={effectiveTab === "preview" ? 0 : -1}
              onClick={() => setActiveTab("preview")}
              className={cn(
                "relative px-4 py-2.5 text-xs font-medium transition-colors",
                effectiveTab === "preview"
                  ? "text-[color:var(--color-foreground)]"
                  : "text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
              )}
            >
              ตัวอย่าง (Preview)
              {effectiveTab === "preview" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--color-foreground)]" />
              )}
            </button>
            {templateMode && (
              <button
                type="button"
                id="export-tab-btn-gas"
                role="tab"
                aria-selected={effectiveTab === "gas"}
                tabIndex={effectiveTab === "gas" ? 0 : -1}
                onClick={() => setActiveTab("gas")}
                className={cn(
                  "relative px-4 py-2.5 text-xs font-medium transition-colors",
                  effectiveTab === "gas"
                    ? "text-[color:var(--color-foreground)]"
                    : "text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
                )}
              >
                GAS (Apps Script)
                {effectiveTab === "gas" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--color-foreground)]" />
                )}
              </button>
            )}
          </div>

          <div
            role="tabpanel"
            id="export-tab-file"
            aria-labelledby="export-tab-btn-file"
            hidden={effectiveTab !== "file"}
            className={effectiveTab === "file" ? "contents" : ""}
          >
            {effectiveTab === "file" ? (
              <>
                <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    ซอร์สโค้ด (Source)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1 text-xs font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
                  >
                    {copied ? <Check className="size-3.5 text-[color:var(--color-success)]" /> : <Copy className="size-3.5" />}
                    {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                  </button>
                </div>
                <pre className="m-0 flex-1 overflow-auto bg-[color:var(--color-background)] p-6 font-mono text-xs leading-relaxed text-[color:var(--color-foreground)]">
                  {cleanedHtml === "" && documentHtml.length > 0 ? (
                    <div
                      role="progressbar"
                      aria-label="กำลังประมวลผลตัวอย่าง (Loading preview)"
                      className="space-y-2 animate-pulse"
                    >
                      <div className="h-3 rounded bg-[color:var(--color-border)] w-3/4" />
                      <div className="h-3 rounded bg-[color:var(--color-border)] w-full" />
                      <div className="h-3 rounded bg-[color:var(--color-border)] w-5/6" />
                      <div className="h-3 rounded bg-[color:var(--color-border)] w-2/3" />
                    </div>
                  ) : (
                    <code>{cleanedHtml || "<!-- เอกสารว่างเปล่า -->"}</code>
                  )}
                </pre>
              </div>

              <footer className="flex flex-col gap-4 border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6 py-4">
                {exportHealthIssues.length > 0 && (
                  <ul className="space-y-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-xs">
                    {exportHealthIssues.map((issue) => (
                      <li
                        key={issue.code}
                        className={cn(
                          issue.severity === "error" && "text-[color:var(--color-danger)]",
                          issue.severity === "warning" && "text-[color:var(--color-warning-foreground)]",
                          issue.severity === "info" && "text-[color:var(--color-muted-foreground)]"
                        )}
                      >
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
                {templateMode && (
                  <label className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-muted-foreground)]">
                    <span>ตัวแปรที่ไม่มีค่า (Missing fields):</span>
                    <select
                      value={exportMissingPolicy}
                      onChange={(e) =>
                        setExportMissingPolicy(e.target.value as "bracket" | "blank")
                      }
                      className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1 text-[color:var(--color-foreground)]"
                    >
                      <option value="bracket">แสดง [ชื่อ]</option>
                      <option value="blank">เว้นว่าง</option>
                    </select>
                  </label>
                )}
                {(pendingFormat ?? "html") === "md" ? (
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    หมายเหตุ: Markdown จะฝังรูปภาพในรูปแบบ <code className="font-mono">![alt](src)</code> เสมอ ตัวเลือกรูปภาพด้านล่างใช้กับ HTML/ZIP เท่านั้น
                  </p>
                ) : null}
                <ImageModeToggle imageMode={imageMode} onChange={setImageMode} />

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variant={selectedFormat === "docx" ? "primary" : "secondary"}
                    onClick={() => {
                      setPendingExportFormat("docx");
                      handleDownload("docx");
                    }}
                    disabled={busy !== null}
                    aria-busy={busy === "docx"}
                    aria-label={busy === "docx" ? "กำลังดาวน์โหลด .docx" : "ดาวน์โหลด .docx"}
                  >
                    {busy === "docx" ? (
                      <Loader2 className="animate-spin" role="progressbar" aria-valuetext="กำลังดาวน์โหลด .docx" />
                    ) : (
                      <FileText />
                    )}
                    ดาวน์โหลด .docx
                  </Button>
                  <Button
                    variant={selectedFormat === "zip" ? "primary" : "secondary"}
                    onClick={() => {
                      setPendingExportFormat("zip");
                      handleDownload("zip");
                    }}
                    disabled={busy !== null}
                    aria-busy={busy === "zip"}
                    aria-label={busy === "zip" ? "กำลังดาวน์โหลด .zip" : "ดาวน์โหลด .zip"}
                  >
                    {busy === "zip" ? (
                      <Loader2 className="animate-spin" role="progressbar" aria-valuetext="กำลังดาวน์โหลด .zip" />
                    ) : (
                      <FileArchive />
                    )}
                    ดาวน์โหลด .zip
                  </Button>
                  <Button
                    ref={primaryBtnRef}
                    variant={selectedFormat === "html" ? "primary" : "secondary"}
                    onClick={() => {
                      setPendingExportFormat("html");
                      handleDownload("html");
                    }}
                    disabled={busy !== null}
                    aria-busy={busy === "html"}
                    aria-label={busy === "html" ? "กำลังดาวน์โหลด .html" : "ดาวน์โหลด .html"}
                  >
                    {busy === "html" ? (
                      <Loader2 className="animate-spin" role="progressbar" aria-valuetext="กำลังดาวน์โหลด .html" />
                    ) : (
                      <FileCode2 />
                    )}
                    ดาวน์โหลด .html
                  </Button>
                  <Button
                    variant={selectedFormat === "md" ? "primary" : "secondary"}
                    onClick={() => {
                      setPendingExportFormat("md");
                      handleDownload("md");
                    }}
                    disabled={busy !== null}
                    aria-busy={busy === "md"}
                    aria-label={busy === "md" ? "กำลังดาวน์โหลด .md" : "ดาวน์โหลด .md"}
                  >
                    {busy === "md" ? (
                      <Loader2 className="animate-spin" role="progressbar" aria-valuetext="กำลังดาวน์โหลด .md" />
                    ) : (
                      <FileType2 />
                    )}
                    ดาวน์โหลด .md
                  </Button>
                  <Button
                    variant={selectedFormat === "pdf" ? "primary" : "secondary"}
                    onClick={() => {
                      setPendingExportFormat("pdf");
                      handleDownload("pdf");
                    }}
                    disabled={busy !== null}
                    aria-busy={busy === "pdf"}
                    aria-label={busy === "pdf" ? "กำลังดาวน์โหลด .pdf" : "ดาวน์โหลด .pdf"}
                  >
                    {busy === "pdf" ? (
                      <Loader2 className="animate-spin" role="progressbar" aria-valuetext="กำลังดาวน์โหลด .pdf" />
                    ) : (
                      <FileDown />
                    )}
                    ดาวน์โหลด .pdf
                  </Button>
                </div>
              </footer>
            </>
          ) : null}
          </div>

          <div
            role="tabpanel"
            id="export-tab-preview"
            aria-labelledby="export-tab-btn-preview"
            hidden={effectiveTab !== "preview"}
            className={effectiveTab === "preview" ? "contents" : ""}
          >
            {effectiveTab === "preview" ? (
              <div className="flex min-h-0 flex-col overflow-hidden bg-[color:var(--color-muted)] p-6">
                <div className="mx-auto h-full w-full max-w-[800px] overflow-auto rounded-lg border border-[color:var(--color-border)] bg-white p-8 shadow-[inset_0_1px_0_rgba(0,0,0,0.05)]">
                  <div
                    className="prose prose-stone max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(cleanedHtml) }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div
            role="tabpanel"
            id="export-tab-gas"
            aria-labelledby="export-tab-btn-gas"
            hidden={effectiveTab !== "gas"}
            className={effectiveTab === "gas" ? "contents" : ""}
          >
            {effectiveTab === "gas" ? (
              <>
                <div className="flex min-h-0 flex-col overflow-hidden">
                  <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                      โค้ด GAS (GAS Code)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyGAS}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1 text-xs font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
                    >
                      {gasCopied ? <Check className="size-3.5 text-[color:var(--color-success)]" /> : <Copy className="size-3.5" />}
                      {gasCopied ? "คัดลอกแล้ว" : "คัดลอก"}
                    </button>
                  </div>
                  <pre className="m-0 flex-1 overflow-auto bg-[color:var(--color-background)] p-6 font-mono text-xs leading-relaxed text-[color:var(--color-foreground)]">
                    <code>{gasCode || "// เปิดโหมด Template และเพิ่มตัวแปรเพื่อสร้างโค้ด\n// Enable Template Mode and add variables to generate code"}</code>
                  </pre>
                </div>

                <footer className="flex flex-col gap-3 border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6 py-4">
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-[color:var(--color-muted-foreground)]">
                      ชื่อฟังก์ชัน:
                    </label>
                    <input
                      type="text"
                      value={gasFunctionName}
                      onChange={(e) => setGasFunctionName(e.target.value)}
                      className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[color:var(--color-foreground)]"
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-[color:var(--color-muted-foreground)]">
                    <input
                      type="checkbox"
                      checked={includeSheetIntegration}
                      onChange={(e) => setIncludeSheetIntegration(e.target.checked)}
                      className="rounded border-[color:var(--color-border-strong)]"
                    />
                    รวมฟังก์ชัน integrate กับ Google Sheets
                  </label>
                </footer>
              </>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ImageModeToggleProps {
  imageMode: ImageMode;
  onChange: (mode: ImageMode) => void;
}

function ImageModeToggle({ imageMode, onChange }: ImageModeToggleProps) {
  const options: { value: ImageMode; label: string; hint: string }[] = [
    { value: "inline", label: "Inline (base64)", hint: "ไฟล์เดียวครบในตัว" },
    { value: "separate", label: "แยกไฟล์ (ZIP)", hint: "HTML เล็กลง รูปภาพแยกต่างหาก" },
  ];

  return (
    <fieldset className="flex flex-wrap items-center gap-3 text-xs">
      <legend className="mr-1 text-[color:var(--color-muted-foreground)]">
        รูปภาพ:
      </legend>
      {options.map((opt) => {
        const active = imageMode === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors",
              active
                ? "border-[color:var(--color-foreground)] bg-[color:var(--color-background)] text-[color:var(--color-foreground)]"
                : "border-[color:var(--color-border)] bg-[color:var(--color-background)]/50 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
            )}
          >
            <input
              type="radio"
              name="image-mode"
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "grid h-3.5 w-3.5 place-items-center rounded-full border",
                active
                  ? "border-[color:var(--color-foreground)]"
                  : "border-[color:var(--color-border-strong)]"
              )}
            >
              {active && (
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-foreground)]" />
              )}
            </span>
            <span className="font-medium">{opt.label}</span>
            <span className="text-[10px] text-[color:var(--color-muted-foreground)]">
              · {opt.hint}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
