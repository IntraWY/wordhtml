"use client";

import { cn } from "@/lib/utils";
import type { PlaceholderFieldInfo } from "@/lib/export/inlinePlaceholderFields";

interface FillInFieldsProps {
  fields: PlaceholderFieldInfo[];
  fieldValues: Record<string, string>;
  setFieldValue: (id: string, value: string) => void;
}

/**
 * Fill-in fields form (GAP 02): one text input per `placeholderField` node
 * found in the document. Behaviour-identical extraction from `ExportDialog`.
 * Parent owns `fieldValues` / `setFieldValue` and validates on export.
 */
export function FillInFields({
  fields,
  fieldValues,
  setFieldValue,
}: FillInFieldsProps) {
  if (fields.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
        กรอกข้อมูล (Fill-in fields)
      </span>
      {fields.map((field) => {
        const current = fieldValues[field.fieldId] ?? field.value;
        const missing = field.required && !current.trim();
        return (
          <label key={field.fieldId} className="flex flex-col gap-1 text-xs">
            <span className="text-[color:var(--color-muted-foreground)]">
              {field.label}
              {field.required && (
                <span
                  className="text-[color:var(--color-danger)]"
                  aria-label="จำเป็น (required)"
                >
                  {" "}*
                </span>
              )}
            </span>
            <input
              type="text"
              value={current}
              onChange={(e) => setFieldValue(field.fieldId, e.target.value)}
              aria-invalid={missing || undefined}
              className={cn(
                "rounded-md border bg-[color:var(--color-background)] px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[color:var(--color-foreground)]",
                missing
                  ? "border-[color:var(--color-danger)]"
                  : "border-[color:var(--color-border)]"
              )}
            />
            {missing && (
              <span className="text-[10px] text-[color:var(--color-danger)]">
                จำเป็นต้องกรอกก่อนส่งออก (required)
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
