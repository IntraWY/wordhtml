import { create } from "zustand";
import { persist } from "zustand/middleware";

import { docxToHtml, type MammothMessage } from "@/lib/conversion/docxToHtml";
import { loadHtmlFile } from "@/lib/conversion/loadHtmlFile";
import { markdownToHtml } from "@/lib/importMarkdown";
import { countWords } from "@/lib/text";
import { useToastStore } from "./toastStore";
import { useUiStore } from "./uiStore";
import { editorStorage } from "@/lib/storage";
import { dispatchOpenFile } from "@/lib/events";
import type {
  CleanerKey,
  ImageMode,
  DocumentSnapshot,
  ExportFormat,
  TemplateVariable,
  DataSet,
  PageSetup,
} from "@/types";
import type { ExportMissingPolicy } from "@/lib/placeholders";

const MAX_HISTORY = 20;
const AUTO_SNAPSHOT_IDLE_MS = 120_000; // 2 minutes idle
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
  /** Internal auto-snapshot timer (not persisted). */
  _autoSnapshotTimer: ReturnType<typeof setTimeout> | null;
  // actions
  setHtml: (html: string) => void;
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
  saveSnapshot: () => void;
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
}

const DEFAULT_CLEANERS: CleanerKey[] = ["removeInlineStyles", "removeEmptyTags"];

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
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
      _autoSnapshotTimer: null,

      setHtml: (html) => {
        set({ documentHtml: html, lastEditAt: Date.now() });
        const timer = get()._autoSnapshotTimer;
        if (timer) clearTimeout(timer);
        const newTimer = setTimeout(() => {
          const state = get();
          if (!state.documentHtml.trim()) return;
          const last = state.history[0];
          if (last && last.html === state.documentHtml) return; // no change
          state.saveSnapshot();
        }, AUTO_SNAPSHOT_IDLE_MS);
        set({ _autoSnapshotTimer: newTimer });
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
          set({
            documentHtml: html,
            fileName: name,
            isLoadingFile: false,
            lastLoadWarnings: warnings,
          });
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "ไม่สามารถอ่านไฟล์ได้";
          set({ isLoadingFile: false, loadError: message });
        }
      },
      reset: () =>
        set({
          documentHtml: "",
          fileName: null,
          loadError: null,
          lastLoadWarnings: [],
          pendingExportFormat: null,
          lastEditAt: 0,
          fieldValues: {},
          dataSet: null,
          previewMode: "edit",
        }),

      saveSnapshot: () => {
        const { documentHtml, fileName, history } = get();
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
        useToastStore.getState().show("บันทึก Snapshot แล้ว");
        useUiStore.getState().setLastAction(`Snapshot บันทึก — ${new Date().toLocaleTimeString()}`);
      },

      loadSnapshot: (id) => {
        const { history } = get();
        const snap = history.find((s) => s.id === id);
        if (!snap) return;
        set({
          documentHtml: snap.html,
          fileName: snap.fileName,
        });
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
      setPreviewMode: (previewMode) => set({ previewMode }),
      setFieldValue: (fieldId, value) =>
        set((state) => ({
          fieldValues: { ...state.fieldValues, [fieldId]: value },
        })),
      setExportMissingPolicy: (exportMissingPolicy) => set({ exportMissingPolicy }),
    }),
    {
      name: "wordhtml-editor",
      version: 3,
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
        return state as unknown as EditorState;
      },
      partialize: (state) => ({
        _v: 3,
        enabledCleaners: state.enabledCleaners,
        imageMode: state.imageMode,
        history: state.history,
        pageSetup: state.pageSetup,
        templateMode: state.templateMode,
        variables: state.variables,
        autoCompressImages: state.autoCompressImages,
        spellcheckEnabled: state.spellcheckEnabled,
        exportMissingPolicy: state.exportMissingPolicy,
      }),
    }
  )
);
