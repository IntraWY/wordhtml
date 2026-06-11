// Post-build service-worker generator.
// Walks ./out, builds a precache manifest, injects it into
// scripts/sw.template.js, and writes out/sw.js.
// Wired into `npm run build` (next build && node scripts/build-sw.mjs).
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "out");
const templatePath = join(root, "scripts", "sw.template.js");

/** Recursively list all files under a directory (relative POSIX paths). */
export function listFiles(dir, base = dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      entries.push(...listFiles(full, base));
    } else {
      entries.push(relative(base, full).split("\\").join("/"));
    }
  }
  return entries;
}

/** Pick which exported files belong in the app-shell precache. */
export function selectPrecacheUrls(files) {
  return files
    .filter((f) => {
      if (f === "sw.js") return false;
      if (f.startsWith("_next/static/")) {
        // Skip dev/build metadata; keep chunks, css, media, fonts.
        return !f.endsWith(".map");
      }
      if (f.endsWith(".html")) return true;
      if (f === "manifest.webmanifest" || f === "favicon.ico") return true;
      if (/\.(?:svg|woff2?)$/.test(f)) return true;
      return false;
    })
    .map((f) => (f === "index.html" ? "/index.html" : `/${f}`))
    .sort();
}

function main() {
  const files = listFiles(outDir);
  const urls = selectPrecacheUrls(files);

  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const buildId = process.env.BUILD_ID ?? `v${pkg.version}-${Date.now()}`;

  const template = readFileSync(templatePath, "utf8");
  const sw = template
    .replace("__BUILD_ID__", buildId)
    .replace("__PRECACHE_MANIFEST__", JSON.stringify(urls, null, 2));

  writeFileSync(join(outDir, "sw.js"), sw);
  console.log(
    `[build-sw] wrote out/sw.js — cache wordhtml-${buildId}, ${urls.length} precached URLs`
  );
}

// Allow `import { selectPrecacheUrls }` from tests without side effects.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
