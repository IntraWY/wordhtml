"use client";

import { Clock, Save, Settings2, Bell, BellOff } from "lucide-react";

import { RibbonGroup } from "./RibbonGroup";
import { RibbonButton } from "./RibbonButton";
import { RibbonSelect } from "./RibbonSelect";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { AUTO_SAVE_IDLE_OPTIONS } from "@/types";
import { cn } from "@/lib/utils";

const MAX_HISTORY = 20;

function formatIdleLabel(idleMs: number): string {
  const match = AUTO_SAVE_IDLE_OPTIONS.find((o) => o.value === idleMs);
  return match?.label ?? `${Math.round(idleMs / 1000)} วินาที`;
}

export function RibbonTabSettings() {
  const autoSave = useEditorStore((s) => s.autoSave);
  const setAutoSave = useEditorStore((s) => s.setAutoSave);
  const saveSnapshot = useEditorStore((s) => s.saveSnapshot);
  const historyCount = useEditorStore((s) => s.history.length);
  const hasDoc = useEditorStore((s) => s.documentHtml.trim().length > 0);
  const openHistoryPanel = useUiStore((s) => s.openHistoryPanel);

  const intervalOptions = AUTO_SAVE_IDLE_OPTIONS.map((o) => ({
    value: String(o.value),
    label: o.label,
  }));

  return (
    <>
      <RibbonGroup label="บันทึกอัตโนมัติ (Auto-save)">
        <RibbonButton
          label={
            autoSave.enabled
              ? "ปิด auto-save (Auto-save on)"
              : "เปิด auto-save (Auto-save off)"
          }
          onClick={() => setAutoSave({ enabled: !autoSave.enabled })}
          active={autoSave.enabled}
        >
          <Settings2 className="size-3.5" />
        </RibbonButton>

        <div
          className={cn(
            "flex flex-col gap-0.5",
            !autoSave.enabled && "pointer-events-none opacity-40"
          )}
        >
          <span className="text-[9px] text-[color:var(--color-muted-foreground)]">
            หน่วงหลังพิมพ์
          </span>
          <RibbonSelect
            label="ช่วงเวลาบันทึกอัตโนมัติ"
            value={String(autoSave.idleMs)}
            onChange={(value) => setAutoSave({ idleMs: Number(value) })}
            options={intervalOptions}
            disabled={!autoSave.enabled}
            className="min-w-[9rem] border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
          />
        </div>

        <RibbonButton
          label={
            autoSave.notifyOnSave
              ? "แจ้งเตือนเมื่อบันทึก (Notify)"
              : "เงียบเมื่อบันทึก (Silent)"
          }
          onClick={() => setAutoSave({ notifyOnSave: !autoSave.notifyOnSave })}
          active={autoSave.notifyOnSave}
          disabled={!autoSave.enabled}
        >
          {autoSave.notifyOnSave ? (
            <Bell className="size-3.5" />
          ) : (
            <BellOff className="size-3.5" />
          )}
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="Snapshot">
        <RibbonButton
          label="บันทึกทันที (Ctrl+Shift+S)"
          onClick={() => saveSnapshot()}
          disabled={!hasDoc}
        >
          <Save className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label="ประวัติ Snapshot"
          onClick={openHistoryPanel}
        >
          <Clock className="size-3.5" />
        </RibbonButton>
        <p className="max-w-[11rem] text-[10px] leading-snug text-[color:var(--color-muted-foreground)]">
          {autoSave.enabled ? (
            <>
              บันทึกอัตโนมัติหลังหยุดพิมพ์{" "}
              <span className="font-medium text-[color:var(--color-foreground)]">
                {formatIdleLabel(autoSave.idleMs)}
              </span>
              {" · "}
              {historyCount}/{MAX_HISTORY} รายการ
            </>
          ) : (
            <>ปิด auto-save · {historyCount}/{MAX_HISTORY} snapshot</>
          )}
        </p>
      </RibbonGroup>
    </>
  );
}
