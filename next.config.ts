import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle in .next/standalone so the Docker
  // runtime image ships only the files it needs, not all of node_modules.
  output: "standalone",
};

export default nextConfig;
