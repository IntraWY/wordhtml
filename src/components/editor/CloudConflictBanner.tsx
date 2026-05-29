"use client";

import { X, GitMerge } from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export function CloudConflictBanner() {
  const conflicts = useAuthStore((s) => s.cloudConflicts);
  const dismissCloudConflicts = useAuthStore((s) => s.dismissCloudConflicts);

  if (conflicts.length === 0) return null;

  const count = conflicts.length;
  const sample = conflicts[0];

  return (
    <div
      role="status"
      className={cn(
        "flex shrink-0 items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900",
        "dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
      )}
    >
      <GitMerge className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium">
          แก้ความขัดแย้งแล้ว — ใช้เวอร์ชันล่าสุด (Conflict resolved — last write wins)
        </p>
        <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
          {count === 1
            ? `Snapshot "${sample.fileName ?? sample.id}" — เก็บ ${
                sample.winner === "remote" ? "คลาวด์ (cloud)" : "เครื่องนี้ (local)"
              } ตามเวลา ${new Date(sample.wonSavedAt).toLocaleString("th-TH")}`
            : `พบ ${count} snapshot ที่แก้ไขคนละเครื่อง — เก็บเฉพาะเวอร์ชันที่ใหม่กว่า ไม่รวม HTML อัตโนมัติ`}
        </p>
      </div>
      <button
        type="button"
        onClick={dismissCloudConflicts}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50"
        aria-label="ปิดแจ้งเตือนความขัดแย้ง (Dismiss conflict notice)"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
