import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Cache bust: force rebuild on 2026-05-04
  env: {
    BUILD_ID: "v20260504-001",
  },
};

export default nextConfig;
