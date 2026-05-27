import { create } from "zustand";
import type { PageSetup } from "@/types";
import {
  subscribeTemplates,
  saveTemplate as saveTemplateToFirestore,
  updateTemplateName,
  deleteTemplate as deleteTemplateFromFirestore,
} from "@/lib/templateFirestore";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { useAuthStore } from "@/store/authStore";
import type { Unsubscribe, FirestoreError } from "firebase/firestore";

const MAX_TEMPLATES = 50;

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
  loading: boolean;
  error: string | null;
  openPanel: () => void;
  closePanel: () => void;
  saveTemplate: (name: string, html: string, pageSetup: PageSetup) => Promise<void>;
  renameTemplate: (id: string, name: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  importTemplates: (items: DocumentTemplate[]) => Promise<number>;
}

let unsubscribe: Unsubscribe | null = null;

function getTemplateUid(): string | null {
  return useAuthStore.getState().user?.uid ?? null;
}

function handleSubscriptionError(error: FirestoreError): string {
  if (error.code === "permission-denied") {
    return "ไม่มีสิทธิ์เข้าถึง Templates (Permission denied) — ลองเข้าสู่ระบบ";
  }
  if (error.code === "unauthenticated") {
    return "กรุณาเข้าสู่ระบบเพื่อดู Templates";
  }
  if (error.code === "unavailable" || error.code === "resource-exhausted") {
    return "การเชื่อมต่อ Firebase มีปัญหา กรุณาลองใหม่ภายหลัง";
  }
  return `โหลด Templates ไม่สำเร็จ: ${error.message}`;
}

function stopTemplateSubscription(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

function startTemplateSubscription(): void {
  stopTemplateSubscription();
  const uid = getTemplateUid();
  useTemplateStore.setState({ loading: true, error: null });
  unsubscribe = subscribeTemplates(
    uid,
    (templates) => {
      useTemplateStore.setState({ templates, loading: false, error: null });
    },
    (error) => {
      const message = handleSubscriptionError(error);
      useTemplateStore.setState({ loading: false, error: message });
    }
  );
}

/** Re-subscribe when auth user changes while panel may be open. */
export function restartTemplateSubscription(): void {
  if (useTemplateStore.getState().panelOpen) {
    startTemplateSubscription();
  }
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

function isPageSetup(v: unknown): v is PageSetup {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    (o.size === "A4" || o.size === "Letter") &&
    (o.orientation === "portrait" || o.orientation === "landscape") &&
    !!o.marginMm &&
    typeof o.marginMm === "object"
  );
}

function isDocumentTemplate(t: unknown): t is DocumentTemplate {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.html === "string" &&
    typeof o.createdAt === "string" &&
    isPageSetup(o.pageSetup)
  );
}

export function parseTemplateExport(jsonText: string): DocumentTemplate[] | null {
  try {
    const data = JSON.parse(jsonText);
    if (!data || !Array.isArray(data.templates)) return null;
    const items = data.templates.filter(isDocumentTemplate);
    return items;
  } catch {
    return null;
  }
}

export const useTemplateStore = create<TemplateState>()((set, get) => ({
  templates: [],
  panelOpen: false,
  loading: false,
  error: null,

  openPanel: () => {
    set({ panelOpen: true });
    startTemplateSubscription();
  },

  closePanel: () => {
    set({ panelOpen: false });
    stopTemplateSubscription();
  },

  saveTemplate: async (name, html, pageSetup) => {
    const state = get();
    if (state.templates.length >= MAX_TEMPLATES) {
      set({ error: `เก็บได้สูงสุด ${MAX_TEMPLATES} templates` });
      throw new Error(`Maximum ${MAX_TEMPLATES} templates allowed`);
    }

    const template: DocumentTemplate = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      createdAt: new Date().toISOString(),
      html: sanitizeHtml(html),
      pageSetup,
    };

    await saveTemplateToFirestore(template, getTemplateUid());
  },

  renameTemplate: async (id, name) => {
    await updateTemplateName(id, name, getTemplateUid());
  },

  deleteTemplate: async (id) => {
    await deleteTemplateFromFirestore(id, getTemplateUid());
  },

  importTemplates: async (items) => {
    const state = get();
    const existingIds = new Set(state.templates.map((t) => t.id));
    const newItems = items
      .filter((t) => !existingIds.has(t.id))
      .slice(0, MAX_TEMPLATES - state.templates.length);

    const uid = getTemplateUid();
    await Promise.all(
      newItems.map((item) =>
        saveTemplateToFirestore({ ...item, html: sanitizeHtml(item.html) }, uid)
      )
    );

    return newItems.length;
  },
}));
