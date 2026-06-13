import type { MetadataRoute } from "next";

// PWA manifest so wordhtml can be installed as a standalone desktop/web app.
// Statically emitted at build time (compatible with `output: "export"`).
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "wordhtml — Word ↔ HTML editor",
    short_name: "wordhtml",
    description:
      "Convert Word documents to clean, semantic HTML — and back. 100% in your browser, no uploads.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#3B82F6",
    lang: "th",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
