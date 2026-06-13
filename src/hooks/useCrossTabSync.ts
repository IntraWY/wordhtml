"use client";

import { useEffect } from "react";

import { useEditorStore } from "@/store/editorStore";

/**
 * Cross-tab sync: rehydrate the editor store when its localStorage key
 * changes in another tab. Behaviour-identical extraction of the effect
 * formerly inline in `EditorShell`.
 */
export function useCrossTabSync() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wordhtml-editor") {
        useEditorStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
