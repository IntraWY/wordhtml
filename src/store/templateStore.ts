import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PageSetup } from "./editorStore";

export interface DocumentTemplate {
  id: string;
  name: string;
  createdAt: string;
  html: string;
  pageSetup: PageSetup;
}

interface TemplateState {
  templates: DocumentTemplate[];
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  saveTemplate: (name: string, html: string, pageSetup: PageSetup) => void;
  renameTemplate: (id: string, name: string) => void;
  deleteTemplate: (id: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      templates: [],
      panelOpen: false,

      openPanel: () => set({ panelOpen: true }),
      closePanel: () => set({ panelOpen: false }),

      saveTemplate: (name, html, pageSetup) =>
        set((state) => ({
          templates: [
            {
              id: crypto.randomUUID(),
              name,
              createdAt: new Date().toISOString(),
              html,
              pageSetup,
            },
            ...state.templates,
          ],
        })),

      renameTemplate: (id, name) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, name } : t
          ),
        })),

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),
    }),
    {
      name: "wordhtml-templates",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ templates: state.templates }),
    }
  )
);
