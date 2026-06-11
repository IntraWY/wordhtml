import { describe, it, expect } from "vitest";

// @ts-expect-error — plain JS build script without type declarations
import { selectPrecacheUrls } from "../../scripts/build-sw.mjs";

describe("selectPrecacheUrls", () => {
  const fixture = [
    "index.html",
    "help.html",
    "privacy.html",
    "404.html",
    "manifest.webmanifest",
    "favicon.ico",
    "icon.svg",
    "sw.js",
    "_next/static/chunks/app-abc123.js",
    "_next/static/css/main-def456.css",
    "_next/static/chunks/app-abc123.js.map",
    "_next/static/media/font-789.woff2",
    "robots.txt",
    "some-image.png",
    "docs/readme.txt",
  ];

  it("includes HTML pages, manifest, icons, fonts, and hashed assets", () => {
    const urls = selectPrecacheUrls(fixture);
    expect(urls).toContain("/index.html");
    expect(urls).toContain("/help.html");
    expect(urls).toContain("/manifest.webmanifest");
    expect(urls).toContain("/favicon.ico");
    expect(urls).toContain("/icon.svg");
    expect(urls).toContain("/_next/static/chunks/app-abc123.js");
    expect(urls).toContain("/_next/static/css/main-def456.css");
    expect(urls).toContain("/_next/static/media/font-789.woff2");
  });

  it("excludes the service worker itself, sourcemaps, and misc files", () => {
    const urls = selectPrecacheUrls(fixture);
    expect(urls).not.toContain("/sw.js");
    expect(urls).not.toContain("/_next/static/chunks/app-abc123.js.map");
    expect(urls).not.toContain("/robots.txt");
    expect(urls).not.toContain("/some-image.png");
    expect(urls).not.toContain("/docs/readme.txt");
  });

  it("returns sorted root-relative URLs", () => {
    const urls = selectPrecacheUrls(fixture);
    expect(urls.every((u: string) => u.startsWith("/"))).toBe(true);
    expect(urls).toEqual([...urls].sort());
  });
});
