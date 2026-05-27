"use client";

import { useCallback, useEffect, useState } from "react";

import { useEditorStore } from "@/store/editorStore";
import {
  clearRecoveryDraft,
  flushRecoveryDraft,
  loadRecoveryDraft,
  scheduleRecoveryDraft,
  setRecoveryOptOut,
  shouldOfferRecovery,
  type RecoveryDraft,
} from "@/lib/draftRecovery";

export function useDraftRecovery() {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const fileName = useEditorStore((s) => s.fileName);
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const htmlSyncRevision = useEditorStore((s) => s.htmlSyncRevision);

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<RecoveryDraft | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return;

    const runCheck = () => {
      const state = useEditorStore.getState();
      void loadRecoveryDraft().then((draft) => {
        setChecked(true);
        const latest = state.history[0]?.html;
        const current = state.documentHtml;
        if (shouldOfferRecovery(draft, current, latest)) {
          setPendingDraft(draft);
          setRecoveryOpen(true);
        }
      });
    };

    if (useEditorStore.persist.hasHydrated()) {
      runCheck();
      return;
    }

    return useEditorStore.persist.onFinishHydration(() => {
      runCheck();
    });
  }, [checked]);

  useEffect(() => {
    if (!checked || recoveryOpen) return;
    const html = useEditorStore.getState().getDocumentHtml();
    scheduleRecoveryDraft(html, fileName, pageSetup);
  }, [documentHtml, fileName, pageSetup, htmlSyncRevision, checked, recoveryOpen]);

  useEffect(() => {
    const onUnload = () => flushRecoveryDraft();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const handleRestore = useCallback(() => {
    if (!pendingDraft) return;
    useEditorStore.setState((state) => ({
      documentHtml: pendingDraft.html,
      fileName: pendingDraft.fileName,
      pageSetup: pendingDraft.pageSetup ?? state.pageSetup,
      htmlSyncRevision: state.htmlSyncRevision + 1,
    }));
    clearRecoveryDraft();
    setRecoveryOpen(false);
    setPendingDraft(null);
  }, [pendingDraft]);

  const handleDiscard = useCallback(() => {
    clearRecoveryDraft();
    setRecoveryOpen(false);
    setPendingDraft(null);
  }, []);

  const handleOptOut = useCallback(() => {
    setRecoveryOptOut(true);
    clearRecoveryDraft();
    setRecoveryOpen(false);
    setPendingDraft(null);
  }, []);

  return {
    recoveryOpen,
    pendingDraft,
    handleRestore,
    handleDiscard,
    handleOptOut,
  };
}
