import { describe, expect, it } from "vitest";

import {
  CACHE_PREFIX,
  isAppCache,
  precacheName,
  runtimeName,
  stalecaches,
} from "./cacheNames";

describe("pwa cacheNames", () => {
  it("namespaces precache + runtime by version", () => {
    expect(precacheName("v1")).toBe("wordhtml-precache-v1");
    expect(runtimeName("v1")).toBe("wordhtml-runtime-v1");
    expect(precacheName("v2")).not.toBe(precacheName("v1"));
  });

  it("recognises app-owned cache keys", () => {
    expect(isAppCache(`${CACHE_PREFIX}-precache-v1`)).toBe(true);
    expect(isAppCache(`${CACHE_PREFIX}-runtime-v9`)).toBe(true);
    expect(isAppCache("some-other-cache")).toBe(false);
    expect(isAppCache("firebase-installations")).toBe(false);
  });

  it("purges only stale app caches, never foreign or kept ones", () => {
    const all = [
      precacheName("v1"),
      runtimeName("v1"),
      precacheName("v2"),
      runtimeName("v2"),
      "workbox-precache",
      "firebase-installations",
    ];
    const keep = [precacheName("v2"), runtimeName("v2")];

    const stale = stalecaches(all, keep);

    expect(stale).toContain(precacheName("v1"));
    expect(stale).toContain(runtimeName("v1"));
    expect(stale).not.toContain(precacheName("v2"));
    expect(stale).not.toContain(runtimeName("v2"));
    // Foreign caches are left alone.
    expect(stale).not.toContain("workbox-precache");
    expect(stale).not.toContain("firebase-installations");
  });
});
