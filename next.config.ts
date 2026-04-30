import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-prod",
  output: "export",
  experimental: {
    optimizePackageImports: ["clsx"],
  },
};

export default nextConfig;
