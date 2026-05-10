"use client";

import { create } from "zustand";

interface UiState {
  exportDialogOpen: boolean;
  historyPanelOpen: boolean;
  sourceOpen: boolean;
  fullscreen: boolean;
  searchOpen: boolean;
  pageSetupOpen: boolean;
  shortcutsOpen: boolean;
  tocOpen: boolean;
  batchConvertOpen: boolean;
  headerFooterOpen: boolean;
  paragraphOpen: boolean;
  lastAction: string | null;

  openExportDialog: () => void;
  closeExportDialog: () => void;
  openHistoryPanel: () => void;
  closeHistoryPanel: () => void;
  toggleSource: () => void;
  toggleFullscreen: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  openPageSetup: () => void;
  closePageSetup: () => void;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  openToc: () => void;
  closeToc: () => void;
  openBatchConvert: () => void;
  closeBatchConvert: () => void;
  openHeaderFooter: () => void;
  closeHeaderFooter: () => void;
  openParagraph: () => void;
  closeParagraph: () => void;
  setLastAction: (action: string | null) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  exportDialogOpen: false,
  historyPanelOpen: false,
  sourceOpen: false,
  fullscreen: false,
  searchOpen: false,
  pageSetupOpen: false,
  shortcutsOpen: false,
  tocOpen: false,
  batchConvertOpen: false,
  headerFooterOpen: false,
  paragraphOpen: false,
  lastAction: null,

  openExportDialog: () => set({ exportDialogOpen: true }),
  closeExportDialog: () => set({ exportDialogOpen: false }),
  openHistoryPanel: () => set({ historyPanelOpen: true }),
  closeHistoryPanel: () => set({ historyPanelOpen: false }),
  toggleSource: () => set((s) => ({ sourceOpen: !s.sourceOpen })),
  toggleFullscreen: () => set((s) => ({ fullscreen: !s.fullscreen })),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  openPageSetup: () => set({ pageSetupOpen: true }),
  closePageSetup: () => set({ pageSetupOpen: false }),
  openShortcuts: () => set({ shortcutsOpen: true }),
  closeShortcuts: () => set({ shortcutsOpen: false }),
  openToc: () => set({ tocOpen: true }),
  closeToc: () => set({ tocOpen: false }),
  openBatchConvert: () => set({ batchConvertOpen: true }),
  closeBatchConvert: () => set({ batchConvertOpen: false }),
  openHeaderFooter: () => set({ headerFooterOpen: true }),
  closeHeaderFooter: () => set({ headerFooterOpen: false }),
  openParagraph: () => set({ paragraphOpen: true }),
  closeParagraph: () => set({ paragraphOpen: false }),
  setLastAction: (lastAction) => set({ lastAction }),
}));
