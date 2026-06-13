/*
 * wordhtml service worker — plain, framework-agnostic (no Workbox / next-pwa).
 *
 * Served as a static asset at /sw.js (copied verbatim from /public during
 * `output: "export"`). Privacy-first: it only caches same-origin GET requests
 * for the app shell and Next static assets. It NEVER caches Firebase/Firestore,
 * cross-origin opaque auth responses, or any non-GET request — so sign-in and
 * cloud history continue to hit the network.
 *
 * Strategies:
 *   - navigation requests  -> network-first, fall back to cached "/" shell offline
 *   - same-origin static   -> stale-while-revalidate (serve cache, refresh in bg)
 *   - cross-origin         -> passthrough (never intercepted)
 */

// CACHE_VERSION is derived from the `?v=` query the page registers the worker
// with (the app version — see registerServiceWorker.ts). A new app version
// changes the registration URL, so the browser installs this worker afresh and
// `activate` purges the previous version's caches. Falls back to "v1" when the
// query is absent (e.g. direct /sw.js fetch).
const CACHE_VERSION =
  new URL(self.location.href).searchParams.get("v") || "v1";
const CACHE_PREFIX = "wordhtml";
const PRECACHE = CACHE_PREFIX + "-precache-" + CACHE_VERSION;
const RUNTIME = CACHE_PREFIX + "-runtime-" + CACHE_VERSION;

// The app shell + manifest. Kept minimal; hashed Next chunks are cached at
// runtime because their names are unknown at author time.
const PRECACHE_URLS = ["/", "/manifest.webmanifest"];

// Hosts whose responses must always go to the network (auth / data).
const NEVER_CACHE_HOST_PATTERNS = [
  /firestore\.googleapis\.com/,
  /firebase/,
  /identitytoolkit\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
  /googleapis\.com\/.*\/(documents|channels)/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) =>
        // Don't let one missing URL abort the whole install.
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                key !== PRECACHE &&
                key !== RUNTIME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isNeverCache(url) {
  return NEVER_CACHE_HOST_PATTERNS.some((re) => re.test(url));
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET. Let the browser do everything else (POST to Firestore etc.).
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only. Cross-origin (Google Fonts, Firebase, gstatic) is left
  // untouched so opaque/auth responses never poison the cache.
  if (url.origin !== self.location.origin) return;

  // Defensive: never cache known data/auth endpoints even if same-origin proxied.
  if (isNeverCache(request.url)) return;

  // Navigation requests (HTML documents): network-first with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else same-origin (JS/CSS/fonts/images): stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Fall back to the precached app shell so the SPA can still boot offline.
    const shell = await caches.match("/");
    if (shell) return shell;
    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached || (await network) || Response.error();
}

// Allow the page to trigger an immediate activation of a waiting worker
// (used by the "update available" affordance).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
