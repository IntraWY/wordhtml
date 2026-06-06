import type { MetadataRoute } from "next";

// Minimal robots.txt — allow all crawlers. Statically emitted (output: "export" safe).
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}
