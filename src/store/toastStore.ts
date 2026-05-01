import { create } from "zustand";

interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

let _timer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,

  show: (message) => {
    if (_timer) clearTimeout(_timer);
    set({ message });
    _timer = setTimeout(() => set({ message: null }), 2500);
  },

  hide: () => {
    if (_timer) clearTimeout(_timer);
    set({ message: null });
  },
}));
