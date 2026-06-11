"use client";

import { useEffect, useState } from "react";

// Registers /sw.js (generated post-build by scripts/build-sw.mjs) and shows a
// self-contained update banner when a new version is waiting. Production
// only — `next dev` never serves a service worker.
export function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let reloading = false;

    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // A worker already waiting (e.g. update fetched on a previous visit).
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
        }
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(installing);
            }
          });
        });
      })
      .catch(() => {
        // Registration failure is non-fatal — the app works without offline.
      });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  if (!waitingWorker) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-4 py-2.5 text-sm shadow-lg"
    >
      <span>มีเวอร์ชันใหม่ (Update available)</span>
      <button
        type="button"
        onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}
        className="rounded-md bg-[color:var(--color-accent)] px-3 py-1 text-sm font-medium text-[color:var(--color-accent-foreground)] transition-opacity hover:opacity-90"
      >
        รีโหลด (Reload)
      </button>
      <button
        type="button"
        onClick={() => setWaitingWorker(null)}
        aria-label="ปิด (Dismiss)"
        className="rounded-md px-2 py-1 text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
      >
        ✕
      </button>
    </div>
  );
}
