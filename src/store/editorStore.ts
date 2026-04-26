import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { docxToHtml, type MammothMessage } from "@/lib/conversion/docxToHtml";
import { loadHtmlFile } from "@/lib/conversion/loadHtmlFile";
import type {
  CleanerKey,
  ImageMode,
  DocumentSnapshot,
  ExportFormat,
} from "@/types";

const MAX_HISTORY = 20;

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}

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
  // ui
  isLoadingFile: boolean;
  loadError: string | null;
  lastLoadWarnings: MammothMessage[];
  sourceOpen: boolean;
  previewOpen: boolean;
  // actions
  setHtml: (html: string) => void;
  setFileName: (name: string | null) => void;
  toggleCleaner: (key: CleanerKey) => void;
  setImageMode: (mode: ImageMode) => void;
  openExportDialog: (format?: ExportFormat) => void;
  closeExportDialog: () => void;
  loadFile: (file: File) => Promise<void>;
  triggerFileOpen: () => void;
  clearError: () => void;
  clearLoadWarnings: () => void;
  reset: () => void;
  toggleSource: () => void;
  togglePreview: () => void;
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
      isLoadingFile: false,
      loadError: null,
      lastLoadWarnings: [],
      sourceOpen: false,
      previewOpen: true,

      setHtml: (html) => set({ documentHtml: html }),
      setFileName: (fileName) => set({ fileName }),
      toggleCleaner: (key) =>
        set((state) => ({
          enabledCleaners: state.enabledCleaners.includes(key)
            ? state.enabledCleaners.filter((k) => k !== key)
            : [...state.enabledCleaners, key],
        })),
      setImageMode: (imageMode) => set({ imageMode }),
      openExportDialog: (format) => {
        get().saveSnapshot();
        set({ exportDialogOpen: true, pendingExportFormat: format ?? null });
      },
      closeExportDialog: () =>
        set({ exportDialogOpen: false, pendingExportFormat: null }),
      triggerFileOpen: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("wordhtml:open-file"));
        }
      },
      clearError: () => set({ loadError: null }),
      clearLoadWarnings: () => set({ lastLoadWarnings: [] }),
      toggleSource: () => set((s) => ({ sourceOpen: !s.sourceOpen })),
      togglePreview: () => set((s) => ({ previewOpen: !s.previewOpen })),
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
        const updated = [snapshot, ...history].slice(0, MAX_HISTORY);
        set({ history: updated });
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
      }),
    }
  )
);
