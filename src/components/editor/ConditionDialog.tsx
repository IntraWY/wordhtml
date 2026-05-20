"use client";

import { useId, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { Editor } from "@tiptap/react";
import { useEditorStore } from "@/store/editorStore";

interface ConditionDialogProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
}

const OPERATOR_OPTIONS = [
  { label: "เท่ากับ (==)", value: "==" },
  { label: "ไม่เท่ากับ (!=)", value: "!=" },
  { label: "มากกว่า (>)", value: ">" },
  { label: "น้อยกว่า (<)", value: "<" },
  { label: "มีคำ (contains)", value: "contains" },
];

export function ConditionDialog({ open, onClose, editor }: ConditionDialogProps) {
  const variables = useEditorStore((s) => s.variables);
  const titleId = useId();
  const descId = useId();

  // Derive initial state from editor selection when dialog mounts
  const initial = useMemo(() => {
    if (!editor) return { varName: variables[0]?.name ?? "", operator: "==" as const, value: "" };
    const attrs =
      editor.getAttributes("paragraph") ??
      editor.getAttributes("heading") ??
      editor.getAttributes("table");
    const existing = (attrs?.condition as string) || "";
    if (existing) {
      const match = existing.match(/^\{\{([^}]+)\}\}\s*(==|!=|<|>|contains)\s*(.*)$/);
      if (match) {
        return { varName: match[1], operator: match[2] as "==" | "!=" | "<" | ">" | "contains", value: parseLiteral(match[3]) };
      }
    }
    return { varName: variables[0]?.name ?? "", operator: "==" as const, value: "" };
  }, [editor, variables]);

  const [varName, setVarName] = useState(initial.varName);
  const [operator, setOperator] = useState(initial.operator);
  const [value, setValue] = useState(initial.value);

  const conditionPreview = useMemo(() => {
    if (!varName) return "";
    const quoted = value.includes(" ") ? `'${value}'` : value;
    return `{{${varName}}} ${operator} ${quoted}`;
  }, [varName, operator, value]);

  const handleSet = () => {
    if (!editor || !varName) return;
    const quoted = value.includes(" ") || value.includes("'") ? `'${value}'` : value;
    editor.chain().focus().setCondition(`{{${varName}}} ${operator} ${quoted}`).run();
    onClose();
  };

  const handleClear = () => {
    if (!editor) return;
    editor.chain().focus().clearCondition().run();
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const trigger = document.activeElement as HTMLElement | null;
            trigger?.focus();
          }}
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-lg"
        >
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
            <Dialog.Title id={titleId} className="text-base font-semibold tracking-tight">
              ตั้งเงื่อนไข (Set Condition)
            </Dialog.Title>
            <Dialog.Description id={descId} className="sr-only">
              ตั้งเงื่อนไขการแสดงผลของย่อหน้าหรือตาราง
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="ปิด"
                className="rounded-md p-1 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </header>

          <div className="flex flex-col gap-4 px-5 py-4">
            {/* Variable select */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                ตัวแปร (Variable)
              </span>
              <select
                value={varName}
                onChange={(e) => setVarName(e.target.value)}
                className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-accent)]"
              >
                {variables.length === 0 && (
                  <option value="">ไม่มีตัวแปร</option>
                )}
                {variables.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Operator select */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                เงื่อนไข (Operator)
              </span>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as typeof operator)}
                className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-accent)]"
              >
                {OPERATOR_OPTIONS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Value input */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                ค่า (Value)
              </span>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="เช่น จ้าง หรือ 1000"
                className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-accent)]"
              />
            </label>

            {/* Preview */}
            {conditionPreview && (
              <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/40 px-3 py-2">
                <span className="text-[11px] text-[color:var(--color-muted-foreground)]">เงื่อนไข: </span>
                <code className="text-xs text-[color:var(--color-foreground)]">{conditionPreview}</code>
              </div>
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-5 py-3">
            <Button variant="secondary" size="sm" onClick={handleClear}>
              ลบเงื่อนไข
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button size="sm" onClick={handleSet} disabled={!varName}>
              ตั้งเงื่อนไข
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function parseLiteral(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
