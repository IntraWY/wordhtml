import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PageSetup } from "./editorStore";

const MAX_TEMPLATES = 50;
const TEMPLATE_SIZE_LIMIT = 4 * 1024 * 1024; // 4MB

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
        set((state) => {
          let updated = [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name,
              createdAt: new Date().toISOString(),
              html,
              pageSetup,
            },
            ...state.templates,
          ].slice(0, MAX_TEMPLATES);

          while (
            updated.length > 1 &&
            JSON.stringify(updated).length > TEMPLATE_SIZE_LIMIT
          ) {
            updated = updated.slice(0, -1);
          }

          return { templates: updated };
        }),

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
