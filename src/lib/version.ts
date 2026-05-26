import pkg from "../../package.json";

/** Semantic version from package.json — single source of truth. */
export const APP_VERSION = pkg.version;

/** Build stamp injected at compile time via next.config env. */
export const BUILD_ID = process.env.BUILD_ID ?? "dev";

/** Human-readable label for HTML meta / comments. */
export const APP_VERSION_LABEL = `wordhtml v${APP_VERSION} (${BUILD_ID})`;
