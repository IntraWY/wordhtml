"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/store/authStore";

/** Tracks navigator.onLine and mirrors into authStore for cloud sync UX. */
export function useOnlineStatus(): void {
  const setIsOnline = useAuthStore((s) => s.setIsOnline);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [setIsOnline]);
}
