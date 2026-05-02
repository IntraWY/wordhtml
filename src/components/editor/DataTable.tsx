"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DataSet } from "@/types";

interface DataTableProps {
  dataSet: DataSet;
  onSelectRow: (index: number) => void;
}

export function DataTable({ dataSet, onSelectRow }: DataTableProps) {
  const { headers, rows, currentRowIndex } = dataSet;

  if (headers.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
          ข้อมูลที่นำเข้า (Imported Data)
        </p>
        <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
          {rows.length} แถว
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border border-[color:var(--color-border)]">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
              <th className="w-8 px-2 py-1.5 text-center font-semibold text-[color:var(--color-foreground)]">
                #
              </th>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-2 py-1.5 text-left font-semibold text-[color:var(--color-foreground)] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const active = i === currentRowIndex;
              return (
                <tr
                  key={i}
                  onClick={() => onSelectRow(i)}
                  className={cn(
                    "cursor-pointer border-b border-[color:var(--color-border)] last:border-0 transition-colors",
                    active
                      ? "bg-[color:var(--color-accent)]/10"
                      : "hover:bg-[color:var(--color-muted)]"
                  )}
                >
                  <td className="px-2 py-1.5 text-center">
                    {active ? (
                      <Check className="size-3.5 text-[color:var(--color-accent)] mx-auto" />
                    ) : (
                      <span className="text-[color:var(--color-muted-foreground)]">
                        {i + 1}
                      </span>
                    )}
                  </td>
                  {headers.map((h) => (
                    <td
                      key={h}
                      className={cn(
                        "px-2 py-1.5 whitespace-nowrap",
                        active
                          ? "text-[color:var(--color-foreground)] font-medium"
                          : "text-[color:var(--color-muted-foreground)]"
                      )}
                    >
                      {row[h] ?? ""}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
        คลิกแถวเพื่อเลือกใช้สำหรับ Preview (Click a row to use for preview)
      </p>
    </div>
  );
}
