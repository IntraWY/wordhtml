"use client";

import { create } from "zustand";

export interface PaginationState {
  totalPages: number;
  currentPage: number;
  pageBreaks: number[]; // pixel positions of page breaks from top
  isCalculating: boolean;

  setTotalPages: (n: number) => void;
  setCurrentPage: (n: number) => void;
  setPageBreaks: (breaks: number[]) => void;
  setIsCalculating: (v: boolean) => void;
  nextPage: () => void;
  prevPage: () => void;
}

export const usePaginationStore = create<PaginationState>()((set, get) => ({
  totalPages: 1,
  currentPage: 1,
  pageBreaks: [],
  isCalculating: false,

  setTotalPages: (n) => set({ totalPages: Math.max(1, n) }),
  setCurrentPage: (n) => {
    const { totalPages } = get();
    set({ currentPage: Math.min(Math.max(1, n), totalPages) });
  },
  setPageBreaks: (breaks) => set({ pageBreaks: breaks }),
  setIsCalculating: (v) => set({ isCalculating: v }),

  nextPage: () => {
    const { currentPage, totalPages } = get();
    set({ currentPage: Math.min(currentPage + 1, totalPages) });
  },
  prevPage: () => {
    const { currentPage } = get();
    set({ currentPage: Math.max(currentPage - 1, 1) });
  },
}));
