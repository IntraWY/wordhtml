import { create } from "zustand";
import { persist } from "zustand/middleware";

import { docxToHtml, type MammothMessage } from "@/lib/conversion/docxToHtml";
import { loadHtmlFile } from "@/lib/conversion/loadHtmlFile";
import { markdownToHtml } from "@/lib/importMarkdown";
import { countWords } from "@/lib/text";
import { useToastStore } from "./toastStore";
import { useUiStore } from "./uiStore";
import { editorStorage } from "@/lib/storage";
import { dispatchOpenFile, dispatchEnterPreview } from "@/lib/events";
import { normalizeImagePercentWidths } from "@/lib/imageScale";
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
import { debugPerfLog } from "@/lib/debugPerfLog";
import type { ExportMissingPolicy } from "@/lib/placeholders";

const MAX_HISTORY = 20;
const SNAPSHOT_SIZE_LIMIT = 4 * 1024 * 1024; // 4MB serialized cap

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
  clearHistory: () => void;
  // template actions
  toggleTemplateMode: () => void;
  setVariables: (variables: TemplateVariable[] | ((prev: TemplateVariable[]) => TemplateVariable[])) => void;
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
        set({ documentHtml: html, lastEditAt: Date.now() });
        get().scheduleAutoSnapshot();
        // #region agent log
        debugPerfLog("A", "editorStore.ts:commitDocumentHtml", "store html commit", {
          htmlLen: html.length,
        });
        // #endregion
      };

      return {
      documentHtml: "",
      fileName: null,
      enabledCleaners: DEFAULT_CLEANERS,
      imageMode: "inline",
      pendingExportFormat: null,
      history: [],
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
          const last = current.history[0];
          if (last && last.html === html) return;
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
          } else if (lower.endsWith(".md")) {
            html = await markdownToHtml(file);
          } else {
            throw new Error("ไม่รองรับประเภทไฟล์นี้ กรุณาใช้ .docx, .html, หรือ .md");
          }
          set((state) => ({
            documentHtml: html,
            fileName: name,
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
        set((state) => ({
          documentHtml: "",
          fileName: null,
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
        const { documentHtml, fileName, history, autoSave } = get();
        if (!documentHtml.trim()) return;
        if (history[0]?.html === documentHtml) return;
        const snapshot: DocumentSnapshot = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fileName,
          savedAt: new Date().toISOString(),
          html: documentHtml,
          wordCount: countWords(documentHtml),
        };
        let updated = [snapshot, ...history].slice(0, MAX_HISTORY);

        while (
          updated.length > 1 &&
          JSON.stringify(updated).length > SNAPSHOT_SIZE_LIMIT
        ) {
          updated = updated.slice(0, -1);
        }

        set({ history: updated });

        const showFeedback = source === "manual" || autoSave.notifyOnSave;
        if (showFeedback) {
          const label =
            source === "auto" ? "บันทึกอัตโนมัติแล้ว" : "บันทึก Snapshot แล้ว";
          useToastStore.getState().show(label);
          useUiStore
            .getState()
            .setLastAction(`${label} — ${new Date().toLocaleTimeString()}`);
        }
      },

      loadSnapshot: (id) => {
        const t0 = performance.now();
        const { history } = get();
        const snap = history.find((s) => s.id === id);
        if (!snap) return;
        clearHtmlDebounce();
        pendingDocumentHtml = null;
        set((state) => ({
          documentHtml: snap.html,
          fileName: snap.fileName,
          htmlSyncRevision: state.htmlSyncRevision + 1,
        }));
        // #region agent log
        debugPerfLog("A", "editorStore.ts:loadSnapshot", "snapshot loaded to store", {
          htmlLen: snap.html.length,
          storeMs: Math.round((performance.now() - t0) * 100) / 100,
        });
        // #endregion
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
      },

      deleteSnapshot: (id) => {
        set((state) => ({
          history: state.history.filter((s) => s.id !== id),
        }));
      },

      renameSnapshot: (id, fileName) => {
        set((state) => ({
          history: state.history.map((s) =>
            s.id === id ? { ...s, fileName: fileName || null } : s
          ),
        }));
      },

      clearHistory: () => set({ history: [] }),

      // template actions
      toggleTemplateMode: () =>
        set((s) => ({
          templateMode: !s.templateMode,
          previewMode: s.templateMode ? "edit" : s.previewMode,
        })),
      setVariables: (variables) => set((state) => ({ variables: typeof variables === "function" ? variables(state.variables) : variables })),
      setDataSet: (dataSet) => set({ dataSet }),
      setPreviewMode: (previewMode) => {
        if (previewMode === "preview") {
          dispatchEnterPreview();
          get().flushDocumentHtml();
          const normalized = normalizeImagePercentWidths(
            get().documentHtml,
            get().pageSetup
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
        pageSetup: state.pageSetup,
        templateMode: state.templateMode,
        variables: state.variables,
        autoCompressImages: state.autoCompressImages,
        spellcheckEnabled: state.spellcheckEnabled,
        exportMissingPolicy: state.exportMissingPolicy,
        autoSave: state.autoSave,
      }),
    }
  )
);
