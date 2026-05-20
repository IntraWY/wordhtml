"use client";

import { useState, useCallback } from "react";
import { X, Upload, FileSpreadsheet, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseXlsx, parseCsv, buildDataSet } from "@/lib/importData";
import type { TemplateVariable, DataSet } from "@/types";

interface ImportDataDialogProps {
  open: boolean;
  onClose: () => void;
  existingVariables: TemplateVariable[];
  onImport: (variables: TemplateVariable[], dataSet: DataSet) => void;
}

interface PreviewState {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  matchedVars: { header: string; action: "update" | "create"; varName: string }[];
}

const THAI_ENGLISH_MAP: Record<string, string> = {
  จำนวน: "qty",
  ราคา: "price",
  ราคาต่อหน่วย: "unit_price",
  ยอดรวม: "total",
  วันที่: "date",
  ชื่อ: "name",
  นามสกุล: "surname",
  บริษัท: "company",
  ที่อยู่: "address",
  โทรศัพท์: "phone",
  อีเมล: "email",
  รายการ: "item",
  รายละเอียด: "description",
  จำนวนเงิน: "amount",
};

export function ImportDataDialog({
  open,
  onClose,
  existingVariables,
  onImport,
}: ImportDataDialogProps) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setPreview(null);
    setError("");
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const buildPreview = useCallback(
    (fileName: string, dataSet: DataSet & { columnTypes?: Record<string, string>; columnFormats?: Record<string, string> }) => {
      const existingNames = new Set(existingVariables.map((v) => v.name.toLowerCase()));

      const matchedVars = dataSet.headers.map((header) => {
        const normalizedHeader = header.trim().replace(/\s+/g, "_");
        const lowerHeader = normalizedHeader.toLowerCase();

        // Case-insensitive exact match
        const exactMatch = existingVariables.find(
          (v) => v.name.toLowerCase() === lowerHeader
        );
        if (exactMatch) {
          return { header, action: "update" as const, varName: exactMatch.name };
        }

        // Fuzzy Thai/English match
        const fuzzyName = THAI_ENGLISH_MAP[header.trim()] || THAI_ENGLISH_MAP[lowerHeader];
        if (fuzzyName) {
          const fuzzyMatch = existingVariables.find(
            (v) => v.name.toLowerCase() === fuzzyName.toLowerCase()
          );
          if (fuzzyMatch) {
            return { header, action: "update" as const, varName: fuzzyMatch.name };
          }
        }

        return { header, action: "create" as const, varName: normalizedHeader };
      });

      setPreview({
        fileName,
        headers: dataSet.headers,
        rows: dataSet.rows.slice(0, 5),
        matchedVars,
      });
    },
    [existingVariables]
  );

  const processFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError("");
      try {
        const name = file.name.toLowerCase();
        let dataSet: DataSet & { columnTypes?: Record<string, string>; columnFormats?: Record<string, string> };

        if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
          const raw = await parseXlsx(file);
          dataSet = buildDataSet(raw.headers, raw.rows, { inferTypes: true });
        } else if (name.endsWith(".csv")) {
          const text = await file.text();
          const raw = parseCsv(text);
          dataSet = buildDataSet(raw.headers, raw.rows, { inferTypes: true });
        } else {
          throw new Error("รองรับเฉพาะ .xlsx, .xls, .csv");
        }

        if (dataSet.headers.length === 0) {
          throw new Error("ไม่พบข้อมูลในไฟล์");
        }

        buildPreview(file.name, dataSet);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "ไม่สามารถอ่านไฟล์ได้";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [buildPreview]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleConfirm = useCallback(() => {
    if (!preview) return;

    // Build updated variables list
    const updatedVars = new Map<string, TemplateVariable>(
      existingVariables.map((v) => [v.name, { ...v }])
    );

    preview.matchedVars.forEach((match) => {
      if (match.action === "update") {
        const existing = updatedVars.get(match.varName);
        if (existing) {
          // Keep existing type/format if already set; otherwise infer from column
          // For now we don't overwrite existing type/format to preserve user choices
        }
      } else {
        // Create new variable
        updatedVars.set(match.varName, {
          name: match.varName,
          value: preview.rows[0]?.[match.header] ?? "",
          isList: false,
          type: "text",
        });
      }
    });

    const dataSet: DataSet = {
      headers: preview.headers,
      rows: preview.rows,
      currentRowIndex: 0,
    };

    onImport(Array.from(updatedVars.values()), dataSet);
    handleClose();
  }, [preview, existingVariables, onImport, handleClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[color:var(--color-foreground)]">
            นำเข้าข้อมูล (Import Data)
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-4 py-4">
          {!preview ? (
            <>
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
                  dragOver
                    ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)]/5"
                    : "border-[color:var(--color-border)] bg-[color:var(--color-muted)]/30"
                )}
              >
                <Upload className="size-8 text-[color:var(--color-muted-foreground)]" />
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  ลากไฟล์ .xlsx หรือ .csv มาวางที่นี่
                </p>
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  หรือ
                </p>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="sr-only"
                  />
                  เลือกไฟล์
                </label>
              </div>

              {loading && (
                <p className="text-center text-xs text-[color:var(--color-muted-foreground)]">
                  กำลังอ่านไฟล์...
                </p>
              )}

              {error && (
                <p className="text-center text-xs text-red-600" role="alert">
                  {error}
                </p>
              )}
            </>
          ) : (
            <>
              {/* File info */}
              <div className="flex items-center gap-2 rounded-md bg-[color:var(--color-muted)]/50 px-3 py-2">
                {preview.fileName.endsWith(".csv") ? (
                  <Table className="size-4 text-[color:var(--color-muted-foreground)]" />
                ) : (
                  <FileSpreadsheet className="size-4 text-[color:var(--color-muted-foreground)]" />
                )}
                <span className="text-xs font-medium text-[color:var(--color-foreground)]">
                  {preview.fileName}
                </span>
                <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
                  {preview.rows.length >= 5 ? "5+" : preview.rows.length} แถว / {preview.headers.length} คอลัมน์
                </span>
              </div>

              {/* Preview table */}
              <div className="max-h-48 overflow-auto rounded-md border border-[color:var(--color-border)]">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-[color:var(--color-muted)]">
                    <tr>
                      {preview.headers.map((h) => (
                        <th
                          key={h}
                          className="border-b border-[color:var(--color-border)] px-2 py-1 text-left font-semibold text-[color:var(--color-foreground)]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-b border-[color:var(--color-border)] last:border-0">
                        {preview.headers.map((h) => (
                          <td
                            key={h}
                            className="px-2 py-1 text-[color:var(--color-muted-foreground)]"
                          >
                            {row[h] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mapping summary */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-[color:var(--color-foreground)]">
                  ตัวแปรที่จะสร้าง / อัปเดต
                </p>
                <div className="space-y-1">
                  {preview.matchedVars.map((m) => (
                    <div
                      key={m.header}
                      className="flex items-center justify-between rounded-md bg-[color:var(--color-muted)]/30 px-2 py-1"
                    >
                      <span className="text-[11px] text-[color:var(--color-foreground)]">
                        {m.header}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          m.action === "create"
                            ? "text-green-600"
                            : "text-orange-600"
                        )}
                      >
                        {m.action === "create" ? "สร้างใหม่" : `อัปเดต ${m.varName}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[color:var(--color-border)] px-4 py-3">
          {preview ? (
            <>
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
              >
                เลือกไฟล์ใหม่
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-md bg-[color:var(--color-foreground)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-background)] transition-colors hover:opacity-90"
              >
                ยืนยันนำเข้า
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
