// Service worker template — `scripts/build-sw.mjs` injects the precache
// manifest and build id after `next build`, then writes the result to
// `out/sw.js`. Never served from public/ so dev stays SW-free.

const CACHE_NAME = "wordhtml-__BUILD_ID__";
const PRECACHE_URLS = __PRECACHE_MANIFEST__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // Partial precache failure must not block install; runtime caching
        // will fill the gaps.
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("wordhtml-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const putInCache = async (request, response) => {
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
};

const networkFirstNavigation = async (request) => {
  try {
    const response = await fetch(request);
    return await putInCache(request, response);
  } catch {
    const cached = await caches.match(request);
    return cached || (await caches.match("/index.html")) || Response.error();
  }
};

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  return putInCache(request, response);
};

const staleWhileRevalidate = async (request) => {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((response) => putInCache(request, response))
    .catch(() => undefined);
  return cached || (await network) || Response.error();
};

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept non-GET or cross-origin requests (Firebase Auth/Firestore,
  // Google Fonts CDN, analytics-free guarantee stays intact).
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Hashed build assets + static icons/fonts are immutable per build.
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:svg|ico|png|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
