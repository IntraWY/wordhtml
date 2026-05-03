"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Database,
  Table,
  Trash2,
  Eye,
  Pencil,
  ChevronRight,
  ChevronLeft,
  List,
  Check,
  Plus,
  GripVertical,
  MousePointerClick,
} from "lucide-react";

import { useEditorStore } from "@/store/editorStore";
import { extractVariables } from "@/lib/templateEngine";
import { cn } from "@/lib/utils";
import type { TemplateVariable } from "@/types";
import { PasteDataDialog } from "./PasteDataDialog";
import { DataTable } from "./DataTable";

const DELIMITER_OPTIONS: { label: string; value: string }[] = [
  { label: ", (comma)", value: "," },
  { label: "| (pipe)", value: "|" },
  { label: "↵ (newline)", value: "\n" },
];

export function VariablePanel() {
  const templateMode = useEditorStore((s) => s.templateMode);
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const variables = useEditorStore((s) => s.variables);
  const setVariables = useEditorStore((s) => s.setVariables);
  const dataSet = useEditorStore((s) => s.dataSet);
  const setDataSet = useEditorStore((s) => s.setDataSet);
  const previewMode = useEditorStore((s) => s.previewMode);
  const setPreviewMode = useEditorStore((s) => s.setPreviewMode);

  const [collapsed, setCollapsed] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteKey, setPasteKey] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [newVarName, setNewVarName] = useState("");
  const [addError, setAddError] = useState("");

  // Auto-detect variables when documentHtml changes — additive only:
  // preserves manually-added variables even if not yet in document
  useEffect(() => {
    if (!templateMode) return;
    const detected = extractVariables(documentHtml);
    const currentVars = useEditorStore.getState().variables;
    const currentNames = new Set(currentVars.map((v) => v.name));

    const newVars = detected
      .filter((name) => !currentNames.has(name))
      .map((name) => ({ name, value: "", isList: false } as TemplateVariable));

    if (newVars.length > 0) {
      setVariables([...currentVars, ...newVars]);
    }
  }, [documentHtml, templateMode, setVariables]);

  const handleUpdateVariable = useCallback(
    (name: string, patch: Partial<TemplateVariable>) => {
      const currentVars = useEditorStore.getState().variables;
      setVariables(
        currentVars.map((v) =>
          v.name === name ? { ...v, ...patch } : v
        )
      );
    },
    [setVariables]
  );

  const handleClear = useCallback(() => {
    const currentVars = useEditorStore.getState().variables;
    setVariables(currentVars.map((v) => ({ ...v, value: "", listValues: undefined })));
    setDataSet(null);
  }, [setVariables, setDataSet]);

  const handleSelectRow = useCallback(
    (index: number) => {
      const ds = useEditorStore.getState().dataSet;
      if (!ds) return;
      const updated: typeof ds = { ...ds, currentRowIndex: index };
      setDataSet(updated);
    },
    [setDataSet]
  );

  const handleInsertVariable = useCallback((name: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wordhtml:insert-variable", { detail: name })
      );
    }
  }, []);

  const validateVarName = (raw: string): string | null => {
    const sanitized = raw.trim().replace(/\s+/g, "_").replace(/[^\w\u0E00-\u0E7F_]/g, "");
    if (!sanitized) return "ชื่อตัวแปรต้องไม่ว่างเปล่า";
    if (/^\d/.test(sanitized)) return "ห้ามขึ้นต้นด้วยตัวเลข";
    const existing = useEditorStore.getState().variables;
    if (existing.some((v) => v.name === sanitized)) return "มีตัวแปรนี้อยู่แล้ว";
    return null;
  };

  const handleAddVariable = useCallback(() => {
    const error = validateVarName(newVarName);
    if (error) {
      setAddError(error);
      return;
    }
    const sanitized = newVarName.trim().replace(/\s+/g, "_").replace(/[^\w\u0E00-\u0E7F_]/g, "");
    const currentVars = useEditorStore.getState().variables;
    setVariables([...currentVars, { name: sanitized, value: "", isList: false }]);
    setNewVarName("");
    setIsAdding(false);
    setAddError("");
  }, [newVarName, setVariables]);

  const handleDragStart = useCallback((e: React.DragEvent, name: string) => {
    e.dataTransfer.setData("text/plain", `{{${name}}}`);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  if (!templateMode) return null;

  return (
    <>
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-background)] transition-all duration-200",
          collapsed ? "w-10" : "w-[280px]"
        )}
      >
        {/* Collapsed state: just a vertical toggle button */}
        {collapsed ? (
          <div className="flex flex-1 flex-col items-center py-2">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="ขยายแผงตัวแปร"
              className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="mt-2 flex flex-1 items-center justify-center">
              <span
                className="block text-[10px] font-semibold uppercase tracking-widest text-[color:var(--color-muted-foreground)]"
                style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
              >
                ตัวแปร (Vars)
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--color-border)] px-3 py-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Database className="size-4 shrink-0 text-[color:var(--color-muted-foreground)]" />
                <h2 className="truncate text-xs font-semibold tracking-tight text-[color:var(--color-foreground)]">
                  ตัวแปร &amp; ข้อมูล
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="ยุบแผงตัวแปร"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
              >
                <ChevronRight className="size-4" />
              </button>
            </header>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {/* Variables section */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    ตัวแปร ({variables.length})
                  </p>
                  {variables.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[color:var(--color-muted-foreground)] transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-3" />
                      ล้าง
                    </button>
                  )}
                </div>

                {/* Add variable input */}
                {isAdding ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[color:var(--color-muted-foreground)]">{"{{"}</span>
                      <input
                        autoFocus
                        type="text"
                        value={newVarName}
                        onChange={(e) => {
                          setNewVarName(e.target.value);
                          setAddError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddVariable();
                          if (e.key === "Escape") {
                            setIsAdding(false);
                            setNewVarName("");
                            setAddError("");
                          }
                        }}
                        onBlur={() => {
                          // Delay collapse so click events on sibling buttons finish first
                          setTimeout(() => {
                            if (!newVarName.trim()) {
                              setIsAdding(false);
                              setAddError("");
                            }
                          }, 150);
                        }}
                        placeholder="ชื่อตัวแปร"
                        className="flex-1 rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1 text-xs outline-none focus:border-[color:var(--color-foreground)] focus:ring-1 focus:ring-[color:var(--color-foreground)]"
                      />
                      <span className="text-[11px] text-[color:var(--color-muted-foreground)]">{"}}"}</span>
                    </div>
                    {addError && (
                      <p className="text-[10px] text-red-600" role="alert" aria-live="polite">
                        {addError}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-muted)]/50 px-2.5 py-1.5 text-[11px] font-medium text-[color:var(--color-muted-foreground)] transition-colors hover:border-[color:var(--color-foreground)] hover:text-[color:var(--color-foreground)]"
                  >
                    <Plus className="size-3.5" />
                    เพิ่มตัวแปร (Add Variable)
                  </button>
                )}

                {variables.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[color:var(--color-border)] px-3 py-4 text-center">
                    <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
                      พิมพ์ {"{{ชื่อตัวแปร}}"} ในเอกสาร
                      <br />
                      หรือคลิกเพิ่มด้านบน
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {variables.map((v) => (
                      <VariableRow
                        key={v.name}
                        variable={v}
                        onUpdate={(patch) => handleUpdateVariable(v.name, patch)}
                        onInsert={() => handleInsertVariable(v.name)}
                        onDragStart={(e) => handleDragStart(e, v.name)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasteKey((k) => k + 1);
                    setPasteOpen(true);
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2.5 py-1.5 text-[11px] font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
                >
                  <Table className="size-3.5" />
                  วางจาก Sheets
                </button>
              </div>

              {/* Data table */}
              {dataSet && (
                <DataTable dataSet={dataSet} onSelectRow={handleSelectRow} />
              )}
            </div>

            {/* Footer actions */}
            <footer className="shrink-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-3 py-2.5">
              {previewMode === "edit" ? (
                <button
                  type="button"
                  onClick={() => setPreviewMode("preview")}
                  disabled={variables.length === 0}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[color:var(--color-foreground)] px-3 py-2 text-xs font-medium text-[color:var(--color-background)] transition-colors disabled:opacity-40"
                >
                  <Eye className="size-3.5" />
                  Preview
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPreviewMode("edit")}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-xs font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
                >
                  <Pencil className="size-3.5" />
                  กลับไปแก้ไข (Back to Edit)
                </button>
              )}
            </footer>
          </>
        )}
      </aside>

      <PasteDataDialog key={pasteKey} open={pasteOpen} onClose={() => setPasteOpen(false)} />
    </>
  );
}

interface VariableRowProps {
  variable: TemplateVariable;
  onUpdate: (patch: Partial<TemplateVariable>) => void;
  onInsert?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
}

function VariableRow({ variable, onUpdate, onInsert, onDragStart }: VariableRowProps) {
  const { name, value, isList, delimiter } = variable;

  const activeDelimiter = delimiter || ",";

  const handleValueChange = (newValue: string) => {
    const patch: Partial<TemplateVariable> = { value: newValue };
    if (isList) {
      patch.listValues = parseListValues(newValue, activeDelimiter);
    }
    onUpdate(patch);
  };

  const handleToggleList = (checked: boolean) => {
    const patch: Partial<TemplateVariable> = { isList: checked };
    if (checked) {
      const delim = delimiter || ",";
      patch.delimiter = delim;
      patch.listValues = parseListValues(value, delim);
    } else {
      patch.delimiter = undefined;
      patch.listValues = undefined;
    }
    onUpdate(patch);
  };

  const handleDelimiterChange = (newDelimiter: string) => {
    onUpdate({
      delimiter: newDelimiter,
      listValues: parseListValues(value, newDelimiter),
    });
  };

  return (
    <div
      className="group rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-2 space-y-1.5 transition-colors hover:border-[color:var(--color-foreground)]/30"
      draggable
      onDragStart={onDragStart}
    >
      <div className="flex items-center gap-1.5">
        <GripVertical className="size-3 shrink-0 cursor-grab text-[color:var(--color-border-strong)] active:cursor-grabbing group-hover:text-[color:var(--color-muted-foreground)]" />
        <button
          type="button"
          onClick={onInsert}
          title="คลิกเพื่อแทรกที่ cursor (Click to insert at cursor)"
          className="inline-flex items-center gap-1 rounded bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-700 transition-colors hover:bg-orange-100"
        >
          <MousePointerClick className="size-3" />
          {"{{"}
          {name}
          {"}}"}
        </button>
        {isList && (
          <span className="inline-flex items-center gap-0.5 rounded bg-[color:var(--color-muted)] px-1 py-0.5 text-[10px] text-[color:var(--color-muted-foreground)]">
            <List className="size-2.5" />
            รายการ
          </span>
        )}
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder="ค่า (value)"
        className="w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1 text-xs outline-none focus:border-[color:var(--color-foreground)] focus:ring-1 focus:ring-[color:var(--color-foreground)]"
      />

      <div className="flex items-center justify-between">
        <label className="inline-flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={isList}
            onChange={(e) => handleToggleList(e.target.checked)}
            className="sr-only"
          />
          <span
            className={cn(
              "grid h-3.5 w-3.5 place-items-center rounded border transition-colors",
              isList
                ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)]"
                : "border-[color:var(--color-border-strong)] bg-[color:var(--color-background)]"
            )}
          >
            {isList && <Check className="size-2.5 text-[color:var(--color-accent-foreground)]" />}
          </span>
          <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
            รายการ (List)
          </span>
        </label>

        {isList && (
          <select
            value={activeDelimiter}
            onChange={(e) => handleDelimiterChange(e.target.value)}
            className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-1.5 py-0.5 text-[10px] outline-none focus:border-[color:var(--color-foreground)]"
          >
            {DELIMITER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {isList && variable.listValues && variable.listValues.length > 0 && (
        <p className="text-[10px] text-[color:var(--color-muted-foreground)]">
          {variable.listValues.length} รายการ
        </p>
      )}
    </div>
  );
}

function parseListValues(value: string, delimiter: string): string[] {
  if (!value) return [];
  const sep = delimiter === "\n" ? /\r?\n/ : delimiter;
  return value
    .split(sep)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
