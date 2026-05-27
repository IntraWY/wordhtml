import { create } from "zustand";
import type { User } from "firebase/auth";

export type CloudSyncStatus = "idle" | "syncing" | "error";

interface AuthState {
  user: User | null;
  authReady: boolean;
  authLoading: boolean;
  cloudSyncStatus: CloudSyncStatus;
  cloudSyncError: string | null;
  setUser: (user: User | null) => void;
  setAuthReady: (ready: boolean) => void;
  setAuthLoading: (loading: boolean) => void;
  setCloudSyncStatus: (status: CloudSyncStatus, error?: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authReady: false,
  authLoading: false,
  cloudSyncStatus: "idle",
  cloudSyncError: null,
  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setCloudSyncStatus: (cloudSyncStatus, cloudSyncError = null) =>
    set({ cloudSyncStatus, cloudSyncError }),
}));
