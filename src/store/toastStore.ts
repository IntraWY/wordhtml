import { create } from "zustand";

interface ToastState {
  message: string | null;
  type: "success" | "error" | "warning" | null;
  show: (message: string, type?: "success" | "error" | "warning") => void;
  hide: () => void;
}

let _timer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: null,

  show: (message, type = "success") => {
    if (_timer) clearTimeout(_timer);
    set({ message, type });
    _timer = setTimeout(() => set({ message: null, type: null }), 4000);
  },

  hide: () => {
    if (_timer) clearTimeout(_timer);
    set({ message: null, type: null });
  },
}));
