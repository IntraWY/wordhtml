// Pure helpers describing the service-worker cache namespace.
//
// Kept in sync (by convention) with the constants at the top of public/sw.js.
// The SW is plain JS served as a static asset and can't import this module, so
// these mirror its values purely for unit-testing / reuse on the app side.

export const CACHE_PREFIX = "wordhtml";

/** Name of the precache (app shell + manifest) for a given version. */
export function precacheName(version: string): string {
  return `${CACHE_PREFIX}-precache-${version}`;
}

/** Name of the runtime cache (hashed chunks, navigations) for a given version. */
export function runtimeName(version: string): string {
  return `${CACHE_PREFIX}-runtime-${version}`;
}

/** True when a cache key belongs to this app (and may be purged on version bump). */
export function isAppCache(key: string): boolean {
  return key.startsWith(`${CACHE_PREFIX}-`);
}

/** Caches that should be purged on activate, given the current version's keepers. */
export function stalecaches(allKeys: string[], keep: string[]): string[] {
  const keepSet = new Set(keep);
  return allKeys.filter((key) => isAppCache(key) && !keepSet.has(key));
}
