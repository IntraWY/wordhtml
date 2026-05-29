import { create } from "zustand";
import type { User } from "firebase/auth";

import type { SnapshotConflict } from "@/lib/mergeSnapshots";

export type CloudSyncStatus = "idle" | "synced" | "syncing" | "offline" | "error";

interface AuthState {
  user: User | null;
  authReady: boolean;
  authLoading: boolean;
  isOnline: boolean;
  cloudSyncStatus: CloudSyncStatus;
  cloudSyncError: string | null;
  cloudConflicts: SnapshotConflict[];
  setUser: (user: User | null) => void;
  setAuthReady: (ready: boolean) => void;
  setAuthLoading: (loading: boolean) => void;
  setIsOnline: (online: boolean) => void;
  setCloudSyncStatus: (status: CloudSyncStatus, error?: string | null) => void;
  setCloudConflicts: (conflicts: SnapshotConflict[]) => void;
  dismissCloudConflicts: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authReady: false,
  authLoading: false,
  isOnline: true,
  cloudSyncStatus: "idle",
  cloudSyncError: null,
  cloudConflicts: [],
  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setCloudSyncStatus: (cloudSyncStatus, cloudSyncError = null) =>
    set({ cloudSyncStatus, cloudSyncError }),
  setCloudConflicts: (cloudConflicts) => set({ cloudConflicts }),
  dismissCloudConflicts: () => set({ cloudConflicts: [] }),
}));
