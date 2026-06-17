"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/react";
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
  Search,
  Eraser,
  ArrowDownToDot,
} from "lucide-react";

import { useEditorStore } from "@/store/editorStore";
import { useDialogStore } from "@/store/dialogStore";
import { useToastStore } from "@/store/toastStore";
import { extractVariables } from "@/lib/templateEngine";
import { jumpToMergeField } from "@/lib/placeholders";
import {
  filterPanelVariables,
  staleVariableNames,
  nextEmptyVariableName,
  type PanelFilterMode,
} from "@/lib/placeholders/panelFilter";
import { cn } from "@/lib/utils";
import type { TemplateVariable } from "@/types";
import { PasteDataDialog } from "./PasteDataDialog";
import { DataTable } from "./DataTable";
import { dispatchInsertVariable } from "@/lib/events";

const DELIMITER_OPTIONS: { label: string; value: string }[] = [
  { label: ", (comma)", value: "," },
  { label: "| (pipe)", value: "|" },
  { label: "↵ (newline)", value: "\n" },
];

const FILTER_CHIPS: { id: PanelFilterMode; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "inDocument", label: "ในเอกสาร" },
  { id: "unfilled", label: "ยังไม่กรอก" },
];

export function VariablePanel({ editor }: { editor?: Editor | null }) {
  const templateMode = useEditorStore((s) => s.templateMode);
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const variables = useEditorStore((s) => s.variables);
  const setVariables = useEditorStore((s) => s.setVariables);
  const clearAllVariables = useEditorStore((s) => s.clearAllVariables);
  const removeVariable = useEditorStore((s) => s.removeVariable);
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
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<PanelFilterMode>("all");

  // Names actually present in the document — drives filter chips,
  // the stale-cleanup button, and the next-empty jump.
  const documentNames = useMemo(
    () => new Set(extractVariables(documentHtml)),
    [documentHtml]
  );
  const visibleVariables = useMemo(
    () => filterPanelVariables(variables, documentNames, query, filterMode),
    [variables, documentNames, query, filterMode]
  );
  const staleNames = useMemo(
    () => staleVariableNames(variables, documentNames),
    [variables, documentNames]
  );
  const nextEmpty = useMemo(
    () => nextEmptyVariableName(variables, documentNames),
    [variables, documentNames]
  );

  // Auto-detect variables when documentHtml changes — additive only:
  // preserves manually-added variables even if not yet in document
  useEffect(() => {
    if (!templateMode) return;
    const timer = setTimeout(() => {
      const html = useEditorStore.getState().getDocumentHtml();
      const detected = extractVariables(html);
      const currentNames = new Set(
        useEditorStore.getState().variables.map((v) => v.name)
      );

      const newVars = detected
        .filter((name) => !currentNames.has(name))
        .map((name) => ({ name, value: "", isList: false } as TemplateVariable));

      if (newVars.length > 0) {
        setVariables((prev) => [...prev, ...newVars]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [documentHtml, templateMode, setVariables]);

  const handleUpdateVariable = useCallback(
    (name: string, patch: Partial<TemplateVariable>) => {
      setVariables((prev: TemplateVariable[]) =>
        prev.map((v) =>
          v.name === name ? { ...v, ...patch } : v
        )
      );
    },
    [setVariables]
  );

  const handleClear = useCallback(() => {
    const count = useEditorStore.getState().variables.length;
    if (count === 0) return;

    useDialogStore.getState().openConfirm(
      "ลบตัวแปรทั้งหมด (Clear All Variables)",
      `ต้องการลบตัวแปรทั้งหมด (${count} รายการ) ออกจากรายการหรือไม่? ค่าและข้อมูลที่นำเข้าจะถูกล้างด้วย ตัวแปร {{...}} ในเอกสารยังคงอยู่และอาจถูกเพิ่มกลับในรายการเมื่อแก้ไขเอกสาร`,
      () => {
        clearAllVariables();
        useToastStore.getState().show("ลบตัวแปรทั้งหมดแล้ว", "success");
      }
    );
  }, [clearAllVariables]);

  const handleClearStale = useCallback(() => {
    const stale = staleVariableNames(
      useEditorStore.getState().variables,
      new Set(extractVariables(useEditorStore.getState().getDocumentHtml()))
    );
    if (stale.length === 0) return;
    useDialogStore.getState().openConfirm(
      "ล้างตัวแปรที่ไม่ได้ใช้ (Clear unused variables)",
      `ลบตัวแปร ${stale.length} รายการที่ไม่อยู่ในเอกสารแล้ว (${stale.slice(0, 5).join(", ")}${stale.length > 5 ? ", …" : ""}) ออกจากรายการหรือไม่?`,
      () => {
        const staleSet = new Set(stale);
        setVariables((prev) => prev.filter((v) => !staleSet.has(v.name)));
        useToastStore.getState().show(`ลบตัวแปรที่ไม่ได้ใช้ ${stale.length} รายการแล้ว`, "success");
      }
    );
  }, [setVariables]);

  const handleJumpNextEmpty = useCallback(() => {
    if (!nextEmpty || !editor) return;
    jumpToMergeField(editor, nextEmpty);
  }, [nextEmpty, editor]);

  const handleRemoveVariable = useCallback((name: string) => {
    useDialogStore.getState().openConfirm(
      "ลบตัวแปร (Remove Variable)",
      `ต้องการลบ {{${name}}} ออกจากรายการและเอกสารหรือไม่? การลบนี้ไม่สามารถ undo ได้โดยตรง — ใช้ Ctrl+Z หากต้องการย้อนกลับ`,
      () => {
        removeVariable(name);
        useToastStore.getState().show(`ลบตัวแปร {{${name}}} แล้ว`, "success");
      }
    );
  }, [removeVariable]);

  const handleSelectRow = useCallback(
    (index: number) => {
      if (!dataSet) return;
      const updated: typeof dataSet = { ...dataSet, currentRowIndex: index };
      setDataSet(updated);
    },
    [dataSet, setDataSet]
  );

  const handleInsertVariable = useCallback((name: string) => {
    dispatchInsertVariable(name);
  }, []);

  const validateVarName = useCallback((raw: string): string | null => {
    const sanitized = raw.trim().replace(/\s+/g, "_").replace(/[^\w\u0E00-\u0E7F_]/g, "");
    if (!sanitized) return "ชื่อตัวแปรต้องไม่ว่างเปล่า";
    if (/^\d/.test(sanitized)) return "ห้ามขึ้นต้นด้วยตัวเลข";
    if (variables.some((v) => v.name === sanitized)) return "มีตัวแปรนี้อยู่แล้ว";
    return null;
  }, [variables]);

  const handleAddVariable = useCallback(() => {
    const error = validateVarName(newVarName);
    if (error) {
      setAddError(error);
      return;
    }
    const sanitized = newVarName.trim().replace(/\s+/g, "_").replace(/[^\w\u0E00-\u0E7F_]/g, "");
    setVariables([...variables, { name: sanitized, value: "", isList: false }]);
    setNewVarName("");
    setIsAdding(false);
    setAddError("");
  }, [newVarName, variables, setVariables, validateVarName]);

  const handleDragStart = useCallback((e: React.DragEvent, name: string) => {
    e.dataTransfer.setData("text/plain", `{{${name}}}`);
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  if (!templateMode) return null;

  return (
    <>
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-background)] transition-[width] duration-200",
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
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {/* Variables section */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    ตัวแปร ({visibleVariables.length}/{variables.length})
                  </p>
                  <div className="flex items-center gap-0.5">
                    {staleNames.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearStale}
                        aria-label="ล้างตัวแปรที่ไม่ได้ใช้"
                        title={`ล้างตัวแปร ${staleNames.length} รายการที่ไม่อยู่ในเอกสาร (Clear unused)`}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                      >
                        <Eraser className="size-3" aria-hidden="true" />
                        {staleNames.length}
                      </button>
                    )}
                    {variables.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClear}
                        aria-label="ลบตัวแปรทั้งหมด"
                        title="ลบตัวแปรทั้งหมดออกจากรายการ (Remove all variables)"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[color:var(--color-muted-foreground)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                        ล้าง
                      </button>
                    )}
                  </div>
                </div>

                {/* Search + filter chips (only useful once the list grows) */}
                {variables.length > 3 && (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ค้นหาตัวแปร (Search)"
                        aria-label="ค้นหาตัวแปร (Search variables)"
                        className="w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] py-1 pl-6 pr-2 text-xs outline-none focus:border-[color:var(--color-foreground)]"
                      />
                    </div>
                    <div className="flex items-center gap-1" role="group" aria-label="กรองตัวแปร (Filter variables)">
                      {FILTER_CHIPS.map((chip) => (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setFilterMode(chip.id)}
                          aria-pressed={filterMode === chip.id}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                            filterMode === chip.id
                              ? "border-[color:var(--color-accent)] bg-[color:color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[color:var(--color-foreground)]"
                              : "border-[color:var(--color-border)] text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)]"
                          )}
                        >
                          {chip.label}
                        </button>
                      ))}
                      {nextEmpty && editor && (
                        <button
                          type="button"
                          onClick={handleJumpNextEmpty}
                          title={`ไปยัง {{${nextEmpty}}} ที่ยังไม่กรอก (Jump to next empty)`}
                          aria-label="ไปช่องว่างถัดไป (Jump to next empty)"
                          className="ml-auto inline-flex items-center gap-0.5 rounded-full border border-[color:var(--color-border)] px-2 py-0.5 text-[10px] text-[color:var(--color-muted-foreground)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-foreground)]"
                        >
                          <ArrowDownToDot className="size-3" />
                          ช่องว่างถัดไป
                        </button>
                      )}
                    </div>
                  </div>
                )}

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
                ) : visibleVariables.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[color:var(--color-border)] px-3 py-4 text-center">
                    <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
                      ไม่พบตัวแปรตามเงื่อนไขที่กรอง
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visibleVariables.map((v) => (
                      <VariableRow
                        key={v.name}
                        variable={v}
                        inDocument={documentNames.has(v.name)}
                        onUpdate={(patch) => handleUpdateVariable(v.name, patch)}
                        onInsert={() => handleInsertVariable(v.name)}
                        onRemove={() => handleRemoveVariable(v.name)}
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
  inDocument?: boolean;
  onUpdate: (patch: Partial<TemplateVariable>) => void;
  onInsert?: () => void;
  onRemove?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
}

function VariableRow({ variable, inDocument = true, onUpdate, onInsert, onRemove, onDragStart }: VariableRowProps) {
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
        {!inDocument && (
          <span
            title="ตัวแปรนี้ไม่อยู่ในเอกสาร (Not in document)"
            className="inline-flex items-center rounded bg-[color:var(--color-muted)] px-1 py-0.5 text-[10px] text-[color:var(--color-muted-foreground)]"
          >
            ไม่ได้ใช้
          </span>
        )}
        <button
          type="button"
          draggable={false}
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          aria-label="ลบตัวแปร (Remove variable)"
          title="ลบตัวแปร (Remove variable)"
          className="ml-auto inline-flex cursor-pointer items-center rounded-md p-1 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
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
