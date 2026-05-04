import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PageSetup } from "./editorStore";
import { templateStorage } from "@/lib/storage";

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
  importTemplates: (items: DocumentTemplate[]) => number;
}

export function exportAllTemplates(templates: DocumentTemplate[]) {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    templates,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wordhtml-templates-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseTemplateExport(jsonText: string): DocumentTemplate[] | null {
  try {
    const data = JSON.parse(jsonText);
    if (!data || !Array.isArray(data.templates)) return null;
    const items = data.templates.filter(
      (t: unknown) =>
        t &&
        typeof (t as Record<string, unknown>).id === "string" &&
        typeof (t as Record<string, unknown>).name === "string" &&
        typeof (t as Record<string, unknown>).html === "string" &&
        typeof (t as Record<string, unknown>).createdAt === "string" &&
        (t as Record<string, unknown>).pageSetup
    );
    return items as DocumentTemplate[];
  } catch {
    return null;
  }
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

      importTemplates: (items) => {
        let imported = 0;
        set((state) => {
          const existingIds = new Set(state.templates.map((t) => t.id));
          const newItems = items.filter((t) => !existingIds.has(t.id)).slice(0, MAX_TEMPLATES - state.templates.length);
          imported = newItems.length;
          return {
            templates: [...state.templates, ...newItems].slice(0, MAX_TEMPLATES),
          };
        });
        return imported;
      },
    }),
    {
      name: "wordhtml-templates",
      storage: templateStorage,
      partialize: (state) => ({ _v: 1, templates: state.templates }),
    }
  )
);
