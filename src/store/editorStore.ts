import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { docxToHtml, type MammothMessage } from "@/lib/conversion/docxToHtml";
import { loadHtmlFile } from "@/lib/conversion/loadHtmlFile";
import { countWords } from "@/lib/text";
import { useToastStore } from "./toastStore";
import type {
  CleanerKey,
  ImageMode,
  DocumentSnapshot,
  ExportFormat,
} from "@/types";

const MAX_HISTORY = 20;
const AUTO_SNAPSHOT_IDLE_MS = 120_000; // 2 minutes idle
const SNAPSHOT_SIZE_LIMIT = 4 * 1024 * 1024; // 4MB serialized cap

export interface PageSetup {
  size: "A4" | "Letter";
  orientation: "portrait" | "landscape";
  marginMm: { top: number; right: number; bottom: number; left: number };
}

const DEFAULT_PAGE_SETUP: PageSetup = {
  size: "A4",
  orientation: "portrait",
  marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
};

// Module-scoped debounce timer for auto-snapshot. Lives outside the store
// factory so it isn't recreated on each set() and persists across calls.
let autoSnapshotTimer: ReturnType<typeof setTimeout> | null = null;

interface EditorState {
  // document
  documentHtml: string;
  fileName: string | null;
  // cleaning
  enabledCleaners: CleanerKey[];
  // export
  imageMode: ImageMode;
  exportDialogOpen: boolean;
  pendingExportFormat: ExportFormat | null;
  // history
  history: DocumentSnapshot[];
  historyPanelOpen: boolean;
  // page setup
  pageSetup: PageSetup;
  // editing telemetry
  lastEditAt: number;
  // ui
  isLoadingFile: boolean;
  loadError: string | null;
  lastLoadWarnings: MammothMessage[];
  sourceOpen: boolean;
  // actions
  setHtml: (html: string) => void;
  setFileName: (name: string | null) => void;
  toggleCleaner: (key: CleanerKey) => void;
  setImageMode: (mode: ImageMode) => void;
  setPageSetup: (partial: Partial<PageSetup>) => void;
  openExportDialog: (format?: ExportFormat) => void;
  closeExportDialog: () => void;
  setPendingExportFormat: (format: ExportFormat | null) => void;
  loadFile: (file: File) => Promise<void>;
  triggerFileOpen: () => void;
  clearError: () => void;
  clearLoadWarnings: () => void;
  reset: () => void;
  toggleSource: () => void;
  // history actions
  saveSnapshot: () => void;
  loadSnapshot: (id: string) => void;
  duplicateSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  clearHistory: () => void;
  openHistoryPanel: () => void;
  closeHistoryPanel: () => void;
}

const DEFAULT_CLEANERS: CleanerKey[] = ["removeInlineStyles", "removeEmptyTags"];

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      documentHtml: "",
      fileName: null,
      enabledCleaners: DEFAULT_CLEANERS,
      imageMode: "inline",
      exportDialogOpen: false,
      pendingExportFormat: null,
      history: [],
      historyPanelOpen: false,
      pageSetup: DEFAULT_PAGE_SETUP,
      lastEditAt: 0,
      isLoadingFile: false,
      loadError: null,
      lastLoadWarnings: [],
      sourceOpen: false,

      setHtml: (html) => {
        set({ documentHtml: html, lastEditAt: Date.now() });
        if (autoSnapshotTimer) clearTimeout(autoSnapshotTimer);
        autoSnapshotTimer = setTimeout(() => {
          const state = get();
          if (!state.documentHtml.trim()) return;
          const last = state.history[0];
          if (last && last.html === state.documentHtml) return; // no change
          state.saveSnapshot();
        }, AUTO_SNAPSHOT_IDLE_MS);
      },
      setFileName: (fileName) => set({ fileName }),
      toggleCleaner: (key) =>
        set((state) => ({
          enabledCleaners: state.enabledCleaners.includes(key)
            ? state.enabledCleaners.filter((k) => k !== key)
            : [...state.enabledCleaners, key],
        })),
      setImageMode: (imageMode) => set({ imageMode }),
      setPageSetup: (partial) =>
        set((s) => ({
          pageSetup: {
            ...s.pageSetup,
            ...partial,
            marginMm: {
              ...s.pageSetup.marginMm,
              ...(partial.marginMm ?? {}),
            },
          },
        })),
      openExportDialog: (format) => {
        get().saveSnapshot();
        set({ exportDialogOpen: true, pendingExportFormat: format ?? null });
      },
      closeExportDialog: () =>
        set({ exportDialogOpen: false, pendingExportFormat: null }),
      setPendingExportFormat: (format: ExportFormat | null) =>
        set({ pendingExportFormat: format }),
      triggerFileOpen: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("wordhtml:open-file"));
        }
      },
      clearError: () => set({ loadError: null }),
      clearLoadWarnings: () => set({ lastLoadWarnings: [] }),
      toggleSource: () => set((s) => ({ sourceOpen: !s.sourceOpen })),
      loadFile: async (file) => {
        const name = file.name;
        const lower = name.toLowerCase();
        set({ isLoadingFile: true, loadError: null, lastLoadWarnings: [] });
        try {
          let html: string;
          let warnings: MammothMessage[] = [];
          if (lower.endsWith(".docx")) {
            const result = await docxToHtml(file);
            html = result.html;
            warnings = result.warnings;
          } else if (lower.endsWith(".html") || lower.endsWith(".htm")) {
            html = await loadHtmlFile(file);
          } else {
            throw new Error("ไม่รองรับประเภทไฟล์นี้ กรุณาใช้ .docx หรือ .html");
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
          exportDialogOpen: false,
          loadError: null,
          lastLoadWarnings: [],
          pendingExportFormat: null,
          lastEditAt: 0,
        }),

      saveSnapshot: () => {
        const { documentHtml, fileName, history } = get();
        if (!documentHtml.trim()) return;
        const snapshot: DocumentSnapshot = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fileName,
          savedAt: new Date().toISOString(),
          html: documentHtml,
          wordCount: countWords(documentHtml),
        };
        let updated = [snapshot, ...history].slice(0, MAX_HISTORY);

        // Size guard: drop oldest snapshots until serialized list fits within
        // the size budget. Always keep at least the newest snapshot.
        while (
          updated.length > 1 &&
          JSON.stringify(updated).length > SNAPSHOT_SIZE_LIMIT
        ) {
          updated = updated.slice(0, -1); // drop oldest
        }

        set({ history: updated });
        useToastStore.getState().show("บันทึก Snapshot แล้ว");
      },

      loadSnapshot: (id) => {
        const { history } = get();
        const snap = history.find((s) => s.id === id);
        if (!snap) return;
        set({
          documentHtml: snap.html,
          fileName: snap.fileName,
          historyPanelOpen: false,
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

      clearHistory: () => set({ history: [] }),
      openHistoryPanel: () => set({ historyPanelOpen: true }),
      closeHistoryPanel: () => set({ historyPanelOpen: false }),
    }),
    {
      name: "wordhtml-editor",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        enabledCleaners: state.enabledCleaners,
        imageMode: state.imageMode,
        history: state.history,
        pageSetup: state.pageSetup,
      }),
    }
  )
);
