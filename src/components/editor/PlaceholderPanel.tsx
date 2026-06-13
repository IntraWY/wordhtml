"use client";

import { useMemo, useState } from "react";
import {
  Braces,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  AlertTriangle,
  MousePointerClick,
  HelpCircle,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import {
  getMergeFieldStatuses,
  countMissingFields,
  listPageTokensIn,
  jumpToMergeField,
  PAGE_TOKEN_HELP,
} from "@/lib/placeholders";
import { useToastStore } from "@/store/toastStore";
import { resolveHeaderFooter } from "./PageHeaderFooter";
import { dispatchOpenHeaderFooter } from "@/lib/events";
import { replacePageTokens } from "@/lib/placeholders";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { isLiveEditor } from "@/lib/editorLive";

type PanelTab = "fields" | "headerFooter" | "warnings";

export function PlaceholderPanel({ editor }: { editor: Editor | null }) {
  const open = useUiStore((s) => s.placeholderPanelOpen);
  const close = useUiStore((s) => s.closePlaceholderPanel);
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const variables = useEditorStore((s) => s.variables);
  const dataSet = useEditorStore((s) => s.dataSet);
  const previewMode = useEditorStore((s) => s.previewMode);
  const setPreviewMode = useEditorStore((s) => s.setPreviewMode);
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const templateMode = useEditorStore((s) => s.templateMode);
  const toggleTemplateMode = useEditorStore((s) => s.toggleTemplateMode);

  const [tab, setTab] = useState<PanelTab>("fields");
  const [collapsed, setCollapsed] = useState(false);
  const [tokenHelpOpen, setTokenHelpOpen] = useState(false);

  const fieldStatuses = useMemo(
    () => {
      const dataRow = dataSet?.rows[dataSet.currentRowIndex] ?? {};
      return getMergeFieldStatuses(
        documentHtml,
        variables,
        dataRow,
        previewMode === "preview" ? "preview" : "edit"
      );
    },
    [documentHtml, variables, dataSet, previewMode]
  );

  const missingCount = countMissingFields(fieldStatuses);
  const hf = pageSetup.headerFooter;
  const headerFooterPreview = useMemo(() => {
    if (!hf?.enabled) return null;
    const resolved = resolveHeaderFooter(
      1,
      hf.headerHtml ?? "",
      hf.footerHtml ?? "",
      hf.differentFirstPage ?? false,
      hf.differentOddEven ?? false,
      hf.firstPageHeaderHtml,
      hf.firstPageFooterHtml,
      hf.evenHeaderHtml,
      hf.evenFooterHtml
    );
    const tokenCtx = { pageNumber: 1, totalPages: 1 };
    return {
      header: replacePageTokens(resolved.header, tokenCtx),
      footer: replacePageTokens(resolved.footer, tokenCtx),
    };
  }, [hf]);

  const pageTokens = useMemo(() => {
    if (!hf) return [];
    const combined = [
      hf.headerHtml,
      hf.footerHtml,
      hf.firstPageHeaderHtml,
      hf.firstPageFooterHtml,
      hf.evenHeaderHtml,
      hf.evenFooterHtml,
    ]
      .filter(Boolean)
      .join(" ");
    return listPageTokensIn(combined);
  }, [hf]);

  const jumpToField = (name: string) => {
    if (!isLiveEditor(editor)) return;
    const found = jumpToMergeField(editor, name);
    if (!found) {
      useToastStore
        .getState()
        .show("ไม่พบตำแหน่งตัวแปรในเอกสาร (Field not found)", "warning");
    }
  };

  if (!open) return null;

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-background)] transition-all duration-200",
        collapsed ? "w-10" : "w-[300px]"
      )}
    >
      {collapsed ? (
        <div className="flex flex-1 flex-col items-center py-2">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="ขยายแผง Placeholder"
            className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      ) : (
        <>
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-3 py-2">
            <h2 className="text-sm font-semibold">Placeholder</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="ย่อแผง"
                className="rounded-md p-1 text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
              >
                <ChevronRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="ปิดแผง Placeholder"
                className="rounded-md p-1 text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
              >
                ×
              </button>
            </div>
          </header>

          <div className="flex gap-1 border-b border-[color:var(--color-border)] px-2 py-1.5">
            {(
              [
                ["fields", "ตัวแปร", Braces],
                ["headerFooter", "หัว/ท้าย", FileText],
                ["warnings", "คำเตือน", AlertTriangle],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium",
                  tab === id
                    ? "bg-[color:var(--color-muted)] text-[color:var(--color-foreground)]"
                    : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]/60"
                )}
              >
                <Icon className="size-3" />
                {label}
                {id === "warnings" && missingCount > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 text-[9px] text-white">
                    {missingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 text-sm">
            {tab === "fields" && (
              <div className="space-y-3">
                {!templateMode && (
                  <button
                    type="button"
                    onClick={toggleTemplateMode}
                    className="w-full rounded-md border border-dashed border-[color:var(--color-border)] px-3 py-2 text-xs text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
                  >
                    เปิดโหมด Template เพื่อใช้ตัวแปร {"{{name}}"}
                  </button>
                )}
                {fieldStatuses.length === 0 ? (
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    ยังไม่มีตัวแปรในเอกสาร — พิมพ์ {"{{ชื่อ}}"} ใน editor
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {fieldStatuses.map((entry) => (
                      <li
                        key={entry.name}
                        className="flex items-center justify-between gap-2 rounded-md border border-[color:var(--color-border)] px-2 py-1.5"
                      >
                        <div className="min-w-0">
                          <code className="text-xs">{`{{${entry.name}}}`}</code>
                          <p className="text-[10px] text-[color:var(--color-muted-foreground)]">
                            {entry.status === "filled" && "มีค่าแล้ว"}
                            {entry.status === "empty" && "ยังไม่กำหนดค่า"}
                            {entry.status === "missing" && "ไม่มีในแถวข้อมูล"}
                            {entry.status === "invalid" && "รูปแบบไม่ถูกต้อง"}
                          </p>
                        </div>
                        <button
                          type="button"
                          title="ไปที่ตำแหน่ง"
                          onClick={() => jumpToField(entry.name)}
                          disabled={!editor}
                          className="shrink-0 rounded p-1 hover:bg-[color:var(--color-muted)]"
                        >
                          <MousePointerClick className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {templateMode && previewMode === "edit" && dataSet && (
                  <button
                    type="button"
                    onClick={() => setPreviewMode("preview")}
                    className="w-full rounded-md bg-[color:var(--color-accent)] px-3 py-2 text-xs font-medium text-white"
                  >
                    ดูตัวอย่างแถวที่ {(dataSet.currentRowIndex ?? 0) + 1}
                  </button>
                )}
              </div>
            )}

            {tab === "headerFooter" && (
              <div className="space-y-3">
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  Token หัว/ท้าย: {"{page}"}, {"{total}"}, {"{date}"}
                </p>
                <div className="rounded-md border border-[color:var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => setTokenHelpOpen((v) => !v)}
                    aria-expanded={tokenHelpOpen}
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
                  >
                    <HelpCircle className="size-3.5 shrink-0" />
                    <span className="flex-1 text-left">
                      Token ที่รองรับทั้งหมด (All tokens)
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 shrink-0 transition-transform",
                        tokenHelpOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {tokenHelpOpen && (
                    <ul className="space-y-1 border-t border-[color:var(--color-border)] px-2 py-1.5">
                      {PAGE_TOKEN_HELP.map((entry) => (
                        <li
                          key={entry.token}
                          className="flex items-baseline gap-2 text-[10px]"
                        >
                          <code className="shrink-0 rounded bg-[color:var(--color-muted)] px-1 py-0.5 font-mono">
                            {entry.token}
                          </code>
                          <span className="text-[color:var(--color-muted-foreground)]">
                            {entry.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {pageTokens.length > 0 && (
                  <ul className="flex flex-wrap gap-1">
                    {pageTokens.map((t) => (
                      <li
                        key={t}
                        className="rounded bg-[color:var(--color-muted)] px-2 py-0.5 font-mono text-[10px]"
                      >
                        {`{${t}}`}
                      </li>
                    ))}
                  </ul>
                )}
                {hf?.enabled && headerFooterPreview ? (
                  <div className="space-y-2 rounded-md border border-[color:var(--color-border)] p-2 text-xs">
                    <div>
                      <span className="font-medium">ส่วนหัว:</span>
                      <div
                        className="mt-1 text-[color:var(--color-muted-foreground)]"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(
                            headerFooterPreview.header || "(ว่าง)"
                          ),
                        }}
                      />
                    </div>
                    <div>
                      <span className="font-medium">ส่วนท้าย:</span>
                      <div
                        className="mt-1 text-[color:var(--color-muted-foreground)]"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(
                            headerFooterPreview.footer || "(ว่าง)"
                          ),
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    ยังไม่ได้เปิดหัว/ท้ายกระดาษ
                  </p>
                )}
                <button
                  type="button"
                  onClick={dispatchOpenHeaderFooter}
                  className="w-full rounded-md border border-[color:var(--color-border)] px-3 py-2 text-xs hover:bg-[color:var(--color-muted)]"
                >
                  ตั้งค่าหัว/ท้ายกระดาษ…
                </button>
              </div>
            )}

            {tab === "warnings" && (
              <div className="space-y-2">
                {missingCount === 0 ? (
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    ไม่พบตัวแปรที่ยังไม่มีค่า (ในโหมด Preview)
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-red-600">
                      {missingCount} ตัวแปรยังไม่มีค่า — จะแสดงเป็น [ชื่อ] สีแดงใน Preview
                    </p>
                    <ul className="space-y-1">
                      {fieldStatuses
                        .filter((e) => e.status === "missing")
                        .map((e) => (
                          <li key={e.name}>
                            <button
                              type="button"
                              onClick={() => jumpToField(e.name)}
                              className="text-xs text-red-600 underline"
                            >
                              {`{{${e.name}}}`}
                            </button>
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
