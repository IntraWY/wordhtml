"use client";

import { useEffect } from "react";

import { registerServiceWorker } from "@/lib/pwa/registerServiceWorker";
import { useToastStore } from "@/store/toastStore";

/**
 * Mounts the static service worker in production and surfaces an
 * "อัปเดตพร้อมใช้งาน (Update available)" toast when a new worker is waiting.
 * Client-only — renders nothing, safe for static export / SSR.
 *
 * The toast only NOTIFIES — it deliberately does NOT auto-activate-and-reload.
 * The live document never persists (privacy model), so a forced reload would
 * silently discard the user's unsaved work. The waiting worker takes over on
 * the user's next manual reload/navigation, which the toast prompts them to do.
 */
export function ServiceWorkerManager() {
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    const cleanup = registerServiceWorker(() => {
      showToast(
        "อัปเดตพร้อมใช้งาน (Update available) — รีโหลดหน้าเพื่อใช้เวอร์ชันใหม่",
        "success",
      );
    });
    return cleanup;
  }, [showToast]);

  return null;
}
