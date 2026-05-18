import { useCallback } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useToastStore } from "@/store/toastStore";
import { useUiStore } from "@/store/uiStore";
import { applyCleaners } from "@/lib/cleaning/pipeline";

export interface CleanResult {
  beforeLen: number;
  afterLen: number;
  removed: number;
}

export function useCleanDocument() {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const setHtml = useEditorStore((s) => s.setHtml);
  const enabledCleaners = useEditorStore((s) => s.enabledCleaners);
  const saveSnapshot = useEditorStore((s) => s.saveSnapshot);

  const cleanNow = useCallback(
    (
      opts?: {
        onCleaned?: (result: CleanResult) => void;
      }
    ) => {
      if (!documentHtml.trim()) {
        useToastStore.getState().show("ไม่มีเนื้อหาที่จะล้าง", "error");
        return;
      }
      saveSnapshot();
      const beforeLen = documentHtml.length;
      const cleaned = applyCleaners(documentHtml, enabledCleaners);
      const afterLen = cleaned.length;
      const removed = beforeLen - afterLen;
      setHtml(cleaned);

      if (opts?.onCleaned) {
        opts.onCleaned({ beforeLen, afterLen, removed });
      } else {
        const message =
          removed > 0
            ? `ล้างเสร็จแล้ว — ลบ ${removed.toLocaleString()} ตัวอักษร`
            : `ล้างเสร็จแล้ว — ไม่มีการเปลี่ยนแปลง`;
        useToastStore.getState().show(message, "success");
        useUiStore.getState().setLastAction(`ล้างเอกสาร — ลบ ${removed.toLocaleString()} ตัวอักษร`);
      }
    },
    [documentHtml, enabledCleaners, setHtml, saveSnapshot]
  );

  return { cleanNow };
}
