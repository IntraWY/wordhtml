// Registers the static service worker (public/sw.js) in production browsers.
//
// Static export only — there is no Next.js runtime. This runs client-side and
// is a no-op during SSR / build and in development (so the dev server's HMR
// isn't shadowed by a cache-first worker).

import { APP_VERSION } from "@/lib/version";

type UpdateHandler = () => void;

/**
 * Register /sw.js on window load. Returns a cleanup function.
 *
 * @param onUpdateReady called when a new worker is installed and waiting,
 *        i.e. an update is available and will apply on next reload.
 */
export function registerServiceWorker(onUpdateReady?: UpdateHandler): () => void {
  if (typeof window === "undefined") return () => {};
  if (process.env.NODE_ENV !== "production") return () => {};
  if (!("serviceWorker" in navigator)) return () => {};

  let cancelled = false;

  const onLoad = () => {
    // Version-stamp the script URL so a new release re-registers the worker and
    // its `activate` purges the previous version's caches (avoids stale-app
    // lock-in). The static host serves the same /sw.js regardless of the query.
    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(APP_VERSION)}`)
      .then((registration) => {
        if (cancelled) return;

        // A worker is already waiting (update from a previous visit).
        if (registration.waiting && navigator.serviceWorker.controller) {
          onUpdateReady?.();
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // "installed" + an existing controller => this is an update,
            // not the first install.
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              onUpdateReady?.();
            }
          });
        });
      })
      .catch(() => {
        // Registration failures are non-fatal — the app works without the SW.
      });
  };

  window.addEventListener("load", onLoad);

  return () => {
    cancelled = true;
    window.removeEventListener("load", onLoad);
  };
}

/** Ask a waiting worker to activate immediately, then reload to pick it up. */
export function activateWaitingWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration?.waiting) {
      registration.waiting.postMessage("SKIP_WAITING");
    }
  });

  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}
