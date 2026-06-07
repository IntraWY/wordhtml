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
  placeholderPanelOpen: boolean;
  commandPaletteOpen: boolean;
  templateGalleryOpen: boolean;
  officialLetterOpen: boolean;
  crossRefOpen: boolean;
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
  openPlaceholderPanel: () => void;
  closePlaceholderPanel: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openTemplateGallery: () => void;
  closeTemplateGallery: () => void;
  openOfficialLetter: () => void;
  closeOfficialLetter: () => void;
  openCrossRef: () => void;
  closeCrossRef: () => void;
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
  placeholderPanelOpen: false,
  commandPaletteOpen: false,
  templateGalleryOpen: false,
  officialLetterOpen: false,
  crossRefOpen: false,
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
  openPlaceholderPanel: () => set({ placeholderPanelOpen: true }),
  closePlaceholderPanel: () => set({ placeholderPanelOpen: false }),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  openTemplateGallery: () => set({ templateGalleryOpen: true }),
  closeTemplateGallery: () => set({ templateGalleryOpen: false }),
  openOfficialLetter: () => set({ officialLetterOpen: true }),
  closeOfficialLetter: () => set({ officialLetterOpen: false }),
  openCrossRef: () => set({ crossRefOpen: true }),
  closeCrossRef: () => set({ crossRefOpen: false }),
  setLastAction: (lastAction) => set({ lastAction }),
}));
