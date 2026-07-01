"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { Editor } from "@tiptap/react";
import { isLiveEditor } from "@/lib/editorLive";
import {
  readTableProperties,
  DEFAULT_CELL_MARGINS,
  type CellMargins,
} from "@/lib/tiptap/tableProperties";

interface TablePropertiesDialogProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
}

interface DraftState {
  margins: CellMargins;
  cellSpacing: number;
  rowHeight: number;
}

function readDraft(editor: Editor | null): DraftState {
  if (!isLiveEditor(editor)) {
    return { margins: { ...DEFAULT_CELL_MARGINS }, cellSpacing: 0, rowHeight: 0 };
  }
  const v = readTableProperties(editor);
  return {
    margins: v.cellMargins ?? { ...DEFAULT_CELL_MARGINS },
    cellSpacing: v.cellSpacing ?? 0,
    rowHeight: v.rowHeight ?? 0,
  };
}

const MARGIN_FIELDS: { key: keyof CellMargins; label: string }[] = [
  { key: "top", label: "บน (Top)" },
  { key: "bottom", label: "ล่าง (Bottom)" },
  { key: "left", label: "ซ้าย (Left)" },
  { key: "right", label: "ขวา (Right)" },
];

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-[color:var(--color-muted-foreground)]">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={1}
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = Number.parseFloat(e.target.value);
            onChange(Number.isNaN(v) ? 0 : Math.min(max, Math.max(min, v)));
          }}
          className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-1.5 outline-none focus:border-[color:var(--color-accent)]"
        />
        <span className="shrink-0 text-xs text-[color:var(--color-muted-foreground)]">px</span>
      </div>
    </label>
  );
}

export function TablePropertiesDialog({ open, onClose, editor }: TablePropertiesDialogProps) {
  const [draft, setDraft] = useState<DraftState>(() => readDraft(editor));

  const handleSave = () => {
    if (!isLiveEditor(editor)) return;
    editor
      .chain()
      .focus()
      .setTableProperties({
        cellMargins: draft.margins,
        cellSpacing: draft.cellSpacing > 0 ? draft.cellSpacing : null,
        rowHeight: draft.rowHeight > 0 ? draft.rowHeight : null,
      })
      .run();
    onClose();
  };

  const handleReset = () => {
    setDraft({ margins: { ...DEFAULT_CELL_MARGINS }, cellSpacing: 0, rowHeight: 0 });
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
          className="fixed left-1/2 top-1/2 z-50 w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-lg"
        >
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
            <Dialog.Title className="text-base font-semibold tracking-tight">
              คุณสมบัติตาราง (Table Properties)
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              ตั้งค่าระยะขอบในเซลล์ ระยะห่างระหว่างเซลล์ และความสูงแถวของตาราง
            </Dialog.Description>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="gap-1 text-xs"
                title="รีเซ็ตเป็นค่าเริ่มต้น"
              >
                <RotateCcw className="size-3.5" />
                รีเซ็ต
              </Button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="ปิด"
                  className="rounded-md p-1 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
                >
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>
          </header>

          <div key={String(open)} className="space-y-5 px-5 py-4">
            {/* Cell margins */}
            <fieldset>
              <legend className="mb-2 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                ระยะขอบในเซลล์ (Cell margins)
              </legend>
              <div className="grid grid-cols-4 gap-3">
                {MARGIN_FIELDS.map(({ key, label }) => (
                  <NumberField
                    key={key}
                    label={label}
                    value={draft.margins[key]}
                    min={0}
                    max={96}
                    onChange={(v) =>
                      setDraft((d) => ({ ...d, margins: { ...d.margins, [key]: v } }))
                    }
                  />
                ))}
              </div>
            </fieldset>

            {/* Cell spacing + row height */}
            <fieldset>
              <legend className="mb-2 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                ระยะห่าง / ความสูง (Spacing & height)
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="ระยะห่างระหว่างเซลล์ (Cell spacing)"
                  value={draft.cellSpacing}
                  min={0}
                  max={48}
                  onChange={(v) => setDraft((d) => ({ ...d, cellSpacing: v }))}
                />
                <NumberField
                  label="ความสูงแถว (Row height, 0 = อัตโนมัติ)"
                  value={draft.rowHeight}
                  min={0}
                  max={400}
                  onChange={(v) => setDraft((d) => ({ ...d, rowHeight: v }))}
                />
              </div>
              <p className="mt-2 text-[11px] text-[color:var(--color-muted-foreground)]">
                ความสูงแถวเป็นค่า “อย่างน้อย” — แถวจะขยายตามเนื้อหาได้ (เหมือน Word) หรือจะลากเส้นขอบล่างของแถวเพื่อปรับความสูงก็ได้ (Drag the row’s bottom border to resize)
              </p>
            </fieldset>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-5 py-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button size="sm" onClick={handleSave}>
              บันทึก
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
