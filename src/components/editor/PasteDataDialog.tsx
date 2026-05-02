"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Table, Upload } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { parseCSV, detectDelimiter } from "@/lib/csvParser";
import { useEditorStore } from "@/store/editorStore";

import type { DataSet, TemplateVariable } from "@/types";

interface PasteDataDialogProps {
  open: boolean;
  onClose: () => void;
}

interface HeaderMapping {
  variableName: string;
  header: string | null;
}

export function PasteDataDialog({ open, onClose }: PasteDataDialogProps) {
  const variables = useEditorStore((s) => s.variables);
  const setVariables = useEditorStore((s) => s.setVariables);
  const setDataSet = useEditorStore((s) => s.setDataSet);

  const [text, setText] = useState("");
  const [manualOverrides, setManualOverrides] = useState<Record<string, string | null>>({});

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    const result = parseCSV(text);
    if (result.headers.length === 0) return null;
    return result;
  }, [text]);

  const detectedDelimiter = useMemo(() => {
    if (!text.trim()) return ",";
    return detectDelimiter(text);
  }, [text]);

  const mappings = useMemo<HeaderMapping[]>(() => {
    if (!parsed) return [];
    return variables.map((v) => {
      const override = manualOverrides[v.name];
      if (override !== undefined) {
        return { variableName: v.name, header: override || null };
      }
      const match = findBestHeaderMatch(v.name, parsed.headers);
      return { variableName: v.name, header: match };
    });
  }, [parsed, variables, manualOverrides]);

  const previewRows = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.slice(0, 3);
  }, [parsed]);

  const handleImport = () => {
    if (!parsed || parsed.rows.length === 0) return;

    const dataSet: DataSet = {
      headers: parsed.headers,
      rows: parsed.rows,
      currentRowIndex: 0,
    };

    // Populate variable values from first row using mappings
    const firstRow = parsed.rows[0];
    const updatedVariables: TemplateVariable[] = variables.map((v) => {
      const mapping = mappings.find((m) => m.variableName === v.name);
      if (mapping?.header && mapping.header in firstRow) {
        return { ...v, value: firstRow[mapping.header] };
      }
      return v;
    });

    setVariables(updatedVariables);
    setDataSet(dataSet);
    onClose();
  };

  const hasData = parsed !== null && parsed.headers.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(640px,92vw)] max-h-[88vh] -translate-x-1/2 -translate-y-1/2 flex flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]">
          <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
            <div className="flex items-center gap-2">
              <Table className="size-4 text-[color:var(--color-muted-foreground)]" />
              <Dialog.Title className="text-base font-semibold tracking-tight">
                วางข้อมูลจาก Sheets (Paste from Sheets)
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                วางข้อมูล CSV หรือ tab-delimited เพื่อนำเข้าตัวแปร
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="ปิด"
              className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  ข้อมูล (Data)
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  placeholder={`คัดลอกจาก Google Sheets แล้ววางที่นี่\nCopy from Google Sheets and paste here`}
                  className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm font-mono leading-relaxed outline-none focus:ring-2 focus:ring-[color:var(--color-foreground)] resize-none"
                />
                {text.trim() && (
                  <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                    ตัวคั่นที่ตรวจพบ (Detected delimiter):{" "}
                    <code className="rounded bg-[color:var(--color-muted)] px-1 py-0.5 text-[11px] font-mono">
                      {detectedDelimiter === "\t" ? "Tab" : detectedDelimiter}
                    </code>{" "}
                    · {parsed?.headers.length ?? 0} คอลัมน์ ·{" "}
                    {parsed?.rows.length ?? 0} แถว
                  </p>
                )}
              </div>

              {hasData && (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                      ตัวอย่าง (Preview) — 3 แถวแรก
                    </label>
                    <div className="overflow-x-auto rounded-md border border-[color:var(--color-border)]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
                            {parsed!.headers.map((h) => (
                              <th
                                key={h}
                                className="px-3 py-2 text-left font-semibold text-[color:var(--color-foreground)] whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, i) => (
                            <tr
                              key={i}
                              className="border-b border-[color:var(--color-border)] last:border-0"
                            >
                              {parsed!.headers.map((h) => (
                                <td
                                  key={h}
                                  className="px-3 py-2 text-[color:var(--color-foreground)] whitespace-nowrap"
                                >
                                  {row[h] ?? ""}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {variables.length > 0 && (
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                        จับคู่คอลัมน์ (Column Mapping)
                      </label>
                      <div className="space-y-2">
                        {variables.map((v) => {
                          const mapping = mappings.find(
                            (m) => m.variableName === v.name
                          );
                          return (
                            <div
                              key={v.name}
                              className="flex items-center gap-3"
                            >
                              <code className="w-32 truncate rounded bg-[color:var(--color-muted)] px-2 py-1 text-xs font-mono">
                                {v.name}
                              </code>
                              <span className="text-xs text-[color:var(--color-muted-foreground)]">
                                →
                              </span>
                              <select
                                value={mapping?.header ?? ""}
                                onChange={(e) => {
                                  const header = e.target.value || null;
                                  setManualOverrides((prev) => ({
                                    ...prev,
                                    [v.name]: header,
                                  }));
                                }}
                                className="flex-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[color:var(--color-foreground)]"
                              >
                                <option value="">ไม่ใช้ (Skip)</option>
                                {parsed!.headers.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <footer className="shrink-0 flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6 py-4">
            <Button variant="secondary" size="sm" onClick={onClose}>
              ยกเลิก (Cancel)
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!hasData}
            >
              <Upload className="size-3.5" />
              นำเข้า (Import)
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function findBestHeaderMatch(
  varName: string,
  headers: string[]
): string | null {
  const lowerVar = varName.toLowerCase().replace(/[{}]/g, "");
  if (!lowerVar) return null;

  // Exact match
  const exact = headers.find((h) => h.toLowerCase() === lowerVar);
  if (exact) return exact;

  // Contains match (either direction)
  const contains = headers.find(
    (h) =>
      h.toLowerCase().includes(lowerVar) ||
      lowerVar.includes(h.toLowerCase())
  );
  if (contains) return contains;

  // Levenshtein-like: find header with most common characters in order
  let best: string | null = null;
  let bestScore = 0;
  for (const h of headers) {
    const lowerH = h.toLowerCase();
    let score = 0;
    let vi = 0;
    for (let hi = 0; hi < lowerH.length && vi < lowerVar.length; hi++) {
      if (lowerH[hi] === lowerVar[vi]) {
        score++;
        vi++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = h;
    }
  }
  // Only return fuzzy match if it's reasonably close
  if (best && bestScore >= Math.min(lowerVar.length, 3) * 0.5) {
    return best;
  }

  return null;
}
