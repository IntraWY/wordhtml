import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Cache bust + HTML meta build stamp (see src/lib/version.ts)
  env: {
    BUILD_ID: "v20260526-001",
  },
};

export default nextConfig;
