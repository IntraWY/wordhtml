"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";

export function useBeforeUnload() {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const state = useEditorStore.getState();
      const html = state.documentHtml.trim();
      if (!html) return;
      const lastHistory = state.history[0];
      if (lastHistory && lastHistory.html === state.documentHtml) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
}
