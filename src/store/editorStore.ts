import { create } from "zustand";
import { persist } from "zustand/middleware";

import { docxToHtml, type MammothMessage } from "@/lib/conversion/docxToHtml";
import { xlsxToHtml } from "@/lib/conversion/xlsxToHtml";
import { loadHtmlFile } from "@/lib/conversion/loadHtmlFile";
import { markdownToHtml } from "@/lib/importMarkdown";
import { normalizeIncomingHtml } from "@/lib/pagination/normalizeIncomingHtml";
import { parseProjectFile } from "@/lib/project";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { countWords } from "@/lib/text";
import { useToastStore } from "./toastStore";
import { useUiStore } from "./uiStore";
import { editorStorage } from "@/lib/storage";
import { dispatchOpenFile, dispatchEnterPreview } from "@/lib/events";
import { normalizeImagePercentWidths } from "@/lib/imageScale";
import { measurePageBodyWidthFromDom } from "@/lib/pageContentWidth";
import type {
  CleanerKey,
  ImageMode,
  DocumentSnapshot,
  ExportFormat,
  TemplateVariable,
  DataSet,
  PageSetup,
  AutoSaveSettings,
} from "@/types";
import { DEFAULT_AUTO_SAVE } from "@/types";
import type { ExportMissingPolicy } from "@/lib/placeholders";
import { removeMergeFieldFromHtml } from "@/lib/placeholders/removeMergeField";
import {
  compactVariables,
  mergeRestoredVariables,
  shouldPersistDataSet,
} from "@/lib/placeholders/variableStorage";
import {
  getCloudHistoryUid,
  setPauseCloudHistoryMerge,
} from "@/lib/cloudHistoryBridge";
import {
  saveSnapshotToCloud,
  deleteSnapshotFromCloud,
  renameSnapshotInCloud,
  clearSnapshotsInCloud,
} from "@/lib/historyFirestore";
import { clearRecoveryDraft, scheduleRecoveryDraft } from "@/lib/draftRecovery";
import { isFirebaseConfigured } from "@/lib/firebaseConfig";
import { saveFeedbackLabel } from "@/lib/saveFeedback";

const MAX_HISTORY = 20;
const SNAPSHOT_SIZE_LIMIT = 4 * 1024 * 1024; // 4MB serialized cap

/** Session-scoped binding so refresh keeps in-place save target (not in partialize). */
export const ACTIVE_SNAPSHOT_SESSION_KEY = "wordhtml-active-snapshot-id";

export function setActiveSnapshotSession(id: string | null): void {
  if (typeof sessionStorage === "undefined") return;
  if (id) sessionStorage.setItem(ACTIVE_SNAPSHOT_SESSION_KEY, id);
  else sessionStorage.removeItem(ACTIVE_SNAPSHOT_SESSION_KEY);
}

export function getActiveSnapshotSession(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(ACTIVE_SNAPSHOT_SESSION_KEY);
}

/**
 * Restore the saved document after persisted state hydrates.
 *
 * `activeSnapshotId` now persists in localStorage (see partialize), so on a
 * fresh load we auto-restore the saved snapshot's HTML back into the editor —
 * the document survives reload and reopening, not just an in-session refresh.
 * The session key is kept as a fallback for state persisted before the pointer
 * was added to partialize.
 */
export function restoreActiveSnapshotFromSession(): void {
  const { documentHtml, history, activeSnapshotId } = useEditorStore.getState();
  const candidateId = activeSnapshotId ?? getActiveSnapshotSession();
  const valid =
    candidateId !== null && history.some((s) => s.id === candidateId);

  if (!valid) {
    setActiveSnapshotSession(null);
    useEditorStore.setState({ activeSnapshotId: null });
    return;
  }

  // Fresh load with an empty editor → restore the saved document. loadSnapshot
  // sets documentHtml + activeSnapshotId and bumps htmlSyncRevision so the
  // Tiptap editor re-applies the content regardless of mount timing.
  if (!documentHtml.trim()) {
    useEditorStore.getState().loadSnapshot(candidateId);
    return;
  }

  // Document already present (e.g. recovery draft restored it) — just bind the
  // pointer so saving updates the same entry.
  setActiveSnapshotSession(candidateId);
  useEditorStore.setState({ activeSnapshotId: candidateId });
}

function syncSnapshotToCloud(snapshot: DocumentSnapshot): void {
  const uid = getCloudHistoryUid();
  if (!uid) return;
  void saveSnapshotToCloud(uid, snapshot).catch(() => {
    useToastStore
      .getState()
      .show("ไม่สามารถซิงก์ประวัติไปคลาวด์ได้", "warning");
  });
}

function syncRenameInCloud(id: string, fileName: string | null): void {
  const uid = getCloudHistoryUid();
  if (!uid) return;
  void renameSnapshotInCloud(uid, id, fileName).catch(() => {
    useToastStore
      .getState()
      .show("ไม่สามารถเปลี่ยนชื่อประวัติบนคลาวด์ได้", "warning");
  });
}

async function clearCloudHistory(uid: string): Promise<boolean> {
  setPauseCloudHistoryMerge(true);
  try {
    await clearSnapshotsInCloud(uid);
    return true;
  } catch {
    useToastStore
      .getState()
      .show("ไม่สามารถล้างประวัติบนคลาวด์ได้", "warning");
    return false;
  } finally {
    setPauseCloudHistoryMerge(false);
  }
}

const DEFAULT_PAGE_SETUP: PageSetup = {
  size: "A4",
  orientation: "portrait",
  marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
  headerFooter: {
    enabled: false,
    headerHtml: "",
    footerHtml: "หน้า {page} จาก {total}",
    differentFirstPage: false,
    differentOddEven: false,
    firstPageHeaderHtml: "",
    firstPageFooterHtml: "",
    evenHeaderHtml: "",
    evenFooterHtml: "",
  },
};

interface EditorState {
  // document
  documentHtml: string;
  fileName: string | null;
  // cleaning
  enabledCleaners: CleanerKey[];
  // export
  imageMode: ImageMode;
  pendingExportFormat: ExportFormat | null;
  // history
  history: DocumentSnapshot[];
  /** Snapshot being edited in this session (not persisted). */
  activeSnapshotId: string | null;
  // page setup
  pageSetup: PageSetup;
  // editing telemetry
  lastEditAt: number;
  // ui
  isLoadingFile: boolean;
  loadError: string | null;
  lastLoadWarnings: MammothMessage[];
  // template mode
  templateMode: boolean;
  variables: TemplateVariable[];
  dataSet: DataSet | null;
  previewMode: "edit" | "preview";
  /** Content-control values keyed by fieldId (session-only). */
  fieldValues: Record<string, string>;
  /** How missing {{vars}} appear in export output. */
  exportMissingPolicy: ExportMissingPolicy;
  // image compression
  autoCompressImages: boolean;
  // spellcheck
  spellcheckEnabled: boolean;
  // auto-save
  autoSave: AutoSaveSettings;
  /** Internal auto-snapshot timer (not persisted). */
  _autoSnapshotTimer: ReturnType<typeof setTimeout> | null;
  /** Bumped on bulk external HTML loads (snapshot/file/reset) — not persisted. */
  htmlSyncRevision: number;
  // actions
  setHtml: (html: string, options?: { debounce?: boolean }) => void;
  /** Commit any debounced HTML before save/export/unload. */
  flushDocumentHtml: () => void;
  /** Latest HTML including not-yet-committed editor content. */
  getDocumentHtml: () => string;
  setFileName: (name: string | null) => void;
  toggleCleaner: (key: CleanerKey) => void;
  setImageMode: (mode: ImageMode) => void;
  setPageSetup: (partial: Partial<PageSetup>) => void;
  toggleAutoCompressImages: () => void;
  toggleSpellcheck: () => void;
  prepareExport: (format?: ExportFormat) => void;
  setPendingExportFormat: (format: ExportFormat | null) => void;
  loadFile: (file: File) => Promise<void>;
  triggerFileOpen: () => void;
  clearError: () => void;
  clearLoadWarnings: () => void;
  reset: () => void;
  // history actions
  saveSnapshot: (options?: { source?: "manual" | "auto" }) => void;
  loadSnapshot: (id: string) => void;
  duplicateSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  renameSnapshot: (id: string, fileName: string | null) => void;
  clearHistory: () => Promise<void>;
  // template actions
  toggleTemplateMode: () => void;
  setVariables: (variables: TemplateVariable[] | ((prev: TemplateVariable[]) => TemplateVariable[])) => void;
  /** Clears variable values, imported sheet data, and placeholder field values. */
  clearVariableValues: () => void;
  /** Removes all variables from the panel and clears related template data. */
  clearAllVariables: () => void;
  /** Removes one variable from the panel, document, and related template data. */
  removeVariable: (name: string) => void;
  setDataSet: (dataSet: DataSet | null) => void;
  setPreviewMode: (mode: "edit" | "preview") => void;
  setFieldValue: (fieldId: string, value: string) => void;
  setExportMissingPolicy: (policy: ExportMissingPolicy) => void;
  setAutoSave: (partial: Partial<AutoSaveSettings>) => void;
  scheduleAutoSnapshot: () => void;
}

const DEFAULT_CLEANERS: CleanerKey[] = ["removeInlineStyles", "removeEmptyTags"];
/** Debounce editor → store HTML sync to avoid full getHTML() fan-out every keystroke. */
const HTML_SYNC_DEBOUNCE_MS = 300;

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => {
      let pendingDocumentHtml: string | null = null;
      let htmlDebounceTimer: ReturnType<typeof setTimeout> | null = null;

      const clearHtmlDebounce = () => {
        if (htmlDebounceTimer) {
          clearTimeout(htmlDebounceTimer);
          htmlDebounceTimer = null;
        }
      };

      const commitDocumentHtml = (html: string) => {
        const { fileName, pageSetup } = get();
        set({ documentHtml: html, lastEditAt: Date.now() });
        scheduleRecoveryDraft(html, fileName, pageSetup);
        get().scheduleAutoSnapshot();
      };

      return {
      documentHtml: "",
      fileName: null,
      enabledCleaners: DEFAULT_CLEANERS,
      imageMode: "inline",
      pendingExportFormat: null,
      history: [],
      activeSnapshotId: null,
      pageSetup: DEFAULT_PAGE_SETUP,
      lastEditAt: 0,
      isLoadingFile: false,
      loadError: null,
      lastLoadWarnings: [],
      templateMode: false,
      variables: [],
      dataSet: null,
      previewMode: "edit",
      fieldValues: {},
      exportMissingPolicy: "bracket",
      autoCompressImages: true,
      spellcheckEnabled: true,
      autoSave: DEFAULT_AUTO_SAVE,
      _autoSnapshotTimer: null,
      htmlSyncRevision: 0,

      scheduleAutoSnapshot: () => {
        const state = get();
        const existing = state._autoSnapshotTimer;
        if (existing) clearTimeout(existing);

        const liveHtml = get().getDocumentHtml();
        if (!state.autoSave.enabled || !liveHtml.trim()) {
          set({ _autoSnapshotTimer: null });
          return;
        }

        const newTimer = setTimeout(() => {
          const current = get();
          const html = current.getDocumentHtml();
          if (!current.autoSave.enabled || !html.trim()) return;
          const { activeSnapshotId, history } = current;
          const baseline = activeSnapshotId
            ? history.find((s) => s.id === activeSnapshotId)
            : history[0];
          if (baseline && baseline.html === html) return;
          current.saveSnapshot({ source: "auto" });
        }, state.autoSave.idleMs);

        set({ _autoSnapshotTimer: newTimer });
      },

      setHtml: (html, options) => {
        if (options?.debounce) {
          pendingDocumentHtml = html;
          clearHtmlDebounce();
          htmlDebounceTimer = setTimeout(() => {
            htmlDebounceTimer = null;
            const next = pendingDocumentHtml;
            pendingDocumentHtml = null;
            if (next === null || next === get().documentHtml) return;
            commitDocumentHtml(next);
          }, HTML_SYNC_DEBOUNCE_MS);
          return;
        }
        clearHtmlDebounce();
        pendingDocumentHtml = null;
        if (html === get().documentHtml) return;
        commitDocumentHtml(html);
      },

      flushDocumentHtml: () => {
        clearHtmlDebounce();
        const next = pendingDocumentHtml;
        pendingDocumentHtml = null;
        if (next !== null && next !== get().documentHtml) {
          commitDocumentHtml(next);
        }
      },

      getDocumentHtml: () => pendingDocumentHtml ?? get().documentHtml,

      setAutoSave: (partial) => {
        set((s) => ({ autoSave: { ...s.autoSave, ...partial } }));
        get().scheduleAutoSnapshot();
      },
      setFileName: (fileName) => set({ fileName }),
      toggleCleaner: (key) =>
        set((state) => ({
          enabledCleaners: state.enabledCleaners.includes(key)
            ? state.enabledCleaners.filter((k) => k !== key)
            : [...state.enabledCleaners, key],
        })),
      setImageMode: (imageMode) => set({ imageMode }),
      toggleAutoCompressImages: () =>
        set((state) => ({ autoCompressImages: !state.autoCompressImages })),
      toggleSpellcheck: () =>
        set((state) => ({ spellcheckEnabled: !state.spellcheckEnabled })),
      setPageSetup: (partial) =>
        set((s) => ({
          pageSetup: {
            ...s.pageSetup,
            ...partial,
            marginMm: {
              ...s.pageSetup.marginMm,
              ...(partial.marginMm ?? {}),
            },
            headerFooter: partial.headerFooter
              ? { ...s.pageSetup.headerFooter, ...partial.headerFooter }
              : s.pageSetup.headerFooter,
          },
        })),
      prepareExport: (format) => {
        get().saveSnapshot();
        set({ pendingExportFormat: format ?? null });
      },
      setPendingExportFormat: (format: ExportFormat | null) =>
        set({ pendingExportFormat: format }),
      triggerFileOpen: () => {
        dispatchOpenFile();
      },
      clearError: () => set({ loadError: null }),
      clearLoadWarnings: () => set({ lastLoadWarnings: [] }),
      loadFile: async (file) => {
        const name = file.name;
        const lower = name.toLowerCase();
        set({ isLoadingFile: true, loadError: null, lastLoadWarnings: [] });
        try {
          let html: string;
          let warnings: MammothMessage[] = [];
          if (lower.endsWith(".docx")) {
            if (file.size > 50 * 1024 * 1024) {
              throw new Error("ไฟล์ .docx ใหญ่เกิน 50MB");
            }
            const result = await docxToHtml(file);
            const errors = result.warnings.filter((w) => w.type === "error");
            if (!result.html.trim() && errors.length > 0) {
              throw new Error(errors.map((e) => e.message).join("; "));
            }
            html = result.html;
            warnings = result.warnings;
          } else if (lower.endsWith(".html") || lower.endsWith(".htm")) {
            if (file.size > 5 * 1024 * 1024) {
              useToastStore.getState().show(
                "ไฟล์ HTML ใหญ่มาก — เนื้อหาอาจถูกตัดบางส่วน",
                "warning"
              );
            }
            html = await loadHtmlFile(file);
          } else if (lower.endsWith(".xlsx")) {
            if (file.size > 20 * 1024 * 1024) {
              throw new Error("ไฟล์ .xlsx ใหญ่เกิน 20MB");
            }
            const result = await xlsxToHtml(file);
            html = result.html;
            warnings = result.warnings;
          } else if (lower.endsWith(".md")) {
            html = await markdownToHtml(file);
          } else if (lower.endsWith(".json")) {
            // wordhtml project file — restores the full working state.
            const text = await file.text();
            const project = parseProjectFile(text); // throws on invalid
            clearRecoveryDraft();
            setActiveSnapshotSession(null);
            set((state) => ({
              documentHtml: sanitizeHtml(project.html),
              fileName: project.fileName ?? name,
              pageSetup: project.pageSetup,
              templateMode: project.templateMode,
              variables: project.variables,
              dataSet: project.dataSet,
              previewMode: "edit",
              activeSnapshotId: null,
              isLoadingFile: false,
              loadError: null,
              lastLoadWarnings: [],
              htmlSyncRevision: state.htmlSyncRevision + 1,
            }));
            useToastStore.getState().show("เปิดโปรเจคแล้ว (Project opened)");
            return;
          } else {
            throw new Error(
              "ไม่รองรับประเภทไฟล์นี้ กรุณาใช้ .docx, .xlsx, .html, .md หรือ .json"
            );
          }
          clearRecoveryDraft();
          setActiveSnapshotSession(null);
          // Flatten any pagination wrappers (e.g. opening a previous wordhtml
          // HTML export) so opened files never inject empty "ghost" pages.
          const normalizedHtml = normalizeIncomingHtml(html);
          set((state) => ({
            documentHtml: normalizedHtml,
            fileName: name,
            activeSnapshotId: null,
            isLoadingFile: false,
            lastLoadWarnings: warnings,
            htmlSyncRevision: state.htmlSyncRevision + 1,
          }));
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "ไม่สามารถอ่านไฟล์ได้";
          set({ isLoadingFile: false, loadError: message });
        }
      },
      reset: () => {
        clearHtmlDebounce();
        pendingDocumentHtml = null;
        clearRecoveryDraft();
        setActiveSnapshotSession(null);
        set((state) => ({
          documentHtml: "",
          fileName: null,
          activeSnapshotId: null,
          loadError: null,
          lastLoadWarnings: [],
          pendingExportFormat: null,
          lastEditAt: 0,
          fieldValues: {},
          dataSet: null,
          previewMode: "edit",
          htmlSyncRevision: state.htmlSyncRevision + 1,
        }));
      },

      saveSnapshot: (options) => {
        get().flushDocumentHtml();
        const source = options?.source ?? "manual";

        let snapshotForCloud: DocumentSnapshot | null = null;
        let showFeedback = false;

        set((state) => {
          const documentHtml = state.documentHtml;
          if (!documentHtml.trim()) return state;

          const activeSnap = state.activeSnapshotId
            ? state.history.find((s) => s.id === state.activeSnapshotId)
            : undefined;

          let snapshot: DocumentSnapshot;
          let rest: DocumentSnapshot[];

          // Capture variables with the document so a restored snapshot brings
          // its template values back (Firestore-safe via compactVariables).
          const savedVariables = state.variables.length
            ? compactVariables(state.variables)
            : undefined;

          if (activeSnap) {
            if (
              activeSnap.html === documentHtml &&
              JSON.stringify(activeSnap.variables ?? []) ===
                JSON.stringify(savedVariables ?? [])
            ) {
              return state;
            }
            snapshot = {
              ...activeSnap,
              fileName: state.fileName,
              savedAt: new Date().toISOString(),
              html: documentHtml,
              wordCount: countWords(documentHtml),
              variables: savedVariables,
            };
            rest = state.history.filter((s) => s.id !== state.activeSnapshotId);
          } else {
            snapshot = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              fileName: state.fileName,
              savedAt: new Date().toISOString(),
              html: documentHtml,
              wordCount: countWords(documentHtml),
              variables: savedVariables,
            };
            rest = state.history;
          }

          let updated = [snapshot, ...rest].slice(0, MAX_HISTORY);

          while (
            updated.length > 1 &&
            JSON.stringify(updated).length > SNAPSHOT_SIZE_LIMIT
          ) {
            updated = updated.slice(0, -1);
          }

          snapshotForCloud = snapshot;
          showFeedback = source === "manual" || state.autoSave.notifyOnSave;

          setActiveSnapshotSession(snapshot.id);
          return { history: updated, activeSnapshotId: snapshot.id };
        });

        if (!snapshotForCloud) return;

        syncSnapshotToCloud(snapshotForCloud);
        if (source === "manual") {
          clearRecoveryDraft();
        }

        if (showFeedback) {
          const feedbackLabel = saveFeedbackLabel(source, {
            signedIn: getCloudHistoryUid() !== null,
            firebaseConfigured: isFirebaseConfigured(),
          });
          useToastStore.getState().show(feedbackLabel);
          useUiStore
            .getState()
            .setLastAction(`${feedbackLabel} — ${new Date().toLocaleTimeString()}`);
        }
      },

      loadSnapshot: (id) => {
        const { history } = get();
        const snap = history.find((s) => s.id === id);
        if (!snap) return;
        clearHtmlDebounce();
        pendingDocumentHtml = null;
        setActiveSnapshotSession(id);
        set((state) => ({
          documentHtml: snap.html,
          fileName: snap.fileName,
          activeSnapshotId: id,
          htmlSyncRevision: state.htmlSyncRevision + 1,
          // Restore captured variables — incoming values fill empty slots
          // without clobbering anything the user typed this session.
          ...(snap.variables?.length
            ? {
                variables: mergeRestoredVariables(
                  state.variables,
                  snap.variables
                ),
              }
            : {}),
        }));
      },

      duplicateSnapshot: (id) => {
        const { history } = get();
        const snap = history.find((s) => s.id === id);
        if (!snap) return;
        const duplicate: DocumentSnapshot = {
          ...snap,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          savedAt: new Date().toISOString(),
          fileName: snap.fileName ? `สำเนา — ${snap.fileName}` : "สำเนา",
        };
        const updated = [duplicate, ...history].slice(0, MAX_HISTORY);
        set({ history: updated });
        syncSnapshotToCloud(duplicate);
      },

      deleteSnapshot: async (id) => {
        const uid = getCloudHistoryUid();
        if (uid) {
          try {
            await deleteSnapshotFromCloud(uid, id);
          } catch {
            useToastStore
              .getState()
              .show("ไม่สามารถลบประวัติบนคลาวด์ได้", "warning");
            return;
          }
        }
        set((state) => {
          const clearingActive = state.activeSnapshotId === id;
          if (clearingActive) setActiveSnapshotSession(null);
          return {
            history: state.history.filter((s) => s.id !== id),
            activeSnapshotId: clearingActive ? null : state.activeSnapshotId,
          };
        });
      },

      renameSnapshot: (id, fileName) => {
        const name = fileName || null;
        set((state) => ({
          history: state.history.map((s) =>
            s.id === id ? { ...s, fileName: name } : s
          ),
        }));
        syncRenameInCloud(id, name);
      },

      clearHistory: async () => {
        const uid = getCloudHistoryUid();
        if (uid) {
          const ok = await clearCloudHistory(uid);
          if (!ok) return;
        }
        setActiveSnapshotSession(null);
        set({ history: [], activeSnapshotId: null });
      },

      // template actions
      toggleTemplateMode: () =>
        set((s) => ({
          templateMode: !s.templateMode,
          previewMode: s.templateMode ? "edit" : s.previewMode,
        })),
      setVariables: (variables) => set((state) => ({ variables: typeof variables === "function" ? variables(state.variables) : variables })),
      clearVariableValues: () =>
        set((state) => ({
          variables: state.variables.map((v) => ({
            ...v,
            value: "",
            listValues: undefined,
          })),
          dataSet: null,
          fieldValues: {},
        })),
      clearAllVariables: () =>
        set({
          variables: [],
          dataSet: null,
          fieldValues: {},
          previewMode: "edit",
        }),
      removeVariable: (name) => {
        get().flushDocumentHtml();
        const html = removeMergeFieldFromHtml(get().documentHtml, name);
        clearHtmlDebounce();
        pendingDocumentHtml = null;
        set((state) => {
          const fieldValues = Object.fromEntries(
            Object.entries(state.fieldValues).filter(([key]) => key !== name)
          );
          let dataSet = state.dataSet;
          if (dataSet) {
            const headers = dataSet.headers.filter((h) => h !== name);
            const rows = dataSet.rows.map((row) => {
              const next = { ...row };
              delete next[name];
              return next;
            });
            dataSet = { ...dataSet, headers, rows };
          }
          return {
            documentHtml: html,
            variables: state.variables.filter((v) => v.name !== name),
            dataSet,
            fieldValues,
            htmlSyncRevision: state.htmlSyncRevision + 1,
            lastEditAt: Date.now(),
          };
        });
      },
      setDataSet: (dataSet) => set({ dataSet }),
      setPreviewMode: (previewMode) => {
        if (previewMode === "preview") {
          dispatchEnterPreview();
          get().flushDocumentHtml();
          const normalized = normalizeImagePercentWidths(
            get().documentHtml,
            get().pageSetup,
            measurePageBodyWidthFromDom()
          );
          get().setHtml(normalized);
        }
        set({ previewMode });
      },
      setFieldValue: (fieldId, value) =>
        set((state) => ({
          fieldValues: { ...state.fieldValues, [fieldId]: value },
        })),
      setExportMissingPolicy: (exportMissingPolicy) => set({ exportMissingPolicy }),
    };
    },
    {
      name: "wordhtml-editor",
      version: 4,
      storage: editorStorage,
      migrate: (persistedState: unknown, version) => {
        if (!persistedState || typeof persistedState !== "object") {
          return {} as EditorState;
        }
        const state = persistedState as Record<string, unknown>;
        if (version < 2 && Array.isArray(state.variables)) {
          return {
            ...state,
            variables: (state.variables as TemplateVariable[]).map((v) =>
              v.type === undefined ? { ...v, type: "text" as const } : v
            ),
          } as unknown as EditorState;
        }
        if (version < 3) {
          const { dataSet: _removed, ...rest } = state;
          return rest as unknown as EditorState;
        }
        if (version < 4) {
          return {
            ...state,
            autoSave: DEFAULT_AUTO_SAVE,
          } as unknown as EditorState;
        }
        return state as unknown as EditorState;
      },
      partialize: (state) => ({
        _v: 4,
        enabledCleaners: state.enabledCleaners,
        imageMode: state.imageMode,
        history: state.history,
        // Persisted so the saved document auto-restores on reload/reopen.
        // Additive field — defaults to null for older persisted state via the
        // base store, so no version bump/migration is required.
        activeSnapshotId: state.activeSnapshotId,
        pageSetup: state.pageSetup,
        templateMode: state.templateMode,
        variables: state.variables,
        // Mail-merge data survives reload while it stays small (≤200KB).
        // Additive optional field — base store defaults to null, no migration.
        dataSet: shouldPersistDataSet(state.dataSet) ? state.dataSet : null,
        autoCompressImages: state.autoCompressImages,
        spellcheckEnabled: state.spellcheckEnabled,
        exportMissingPolicy: state.exportMissingPolicy,
        autoSave: state.autoSave,
      }),
    }
  )
);

useEditorStore.persist.onFinishHydration(() => {
  restoreActiveSnapshotFromSession();
});
