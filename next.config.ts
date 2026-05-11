import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/chat": ["./src/data/**/*"],
  },
  devIndicators: false,
};

export default nextConfig;
