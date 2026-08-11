import type { NextConfig } from "next";

/**
 * Optional dev-time proxy to a remote API (set `API_PROXY_TARGET`).
 *
 * Pointing the browser straight at https://api.technestpharma.cloud from
 * localhost does not work, for two independent reasons:
 *   1. the deployed CORS allowlist contains only https://technestpharma.cloud;
 *   2. the refresh cookie is SameSite=Lax, so it is not sent on a cross-site
 *      fetch — login would succeed but every reload would log you out.
 *
 * Proxying through Next keeps every request same-origin (localhost:3000), which
 * sidesteps both. In production the app is served from technestpharma.cloud,
 * which is same-site with the api subdomain, so no proxy is needed there.
 */
const API_PROXY_TARGET = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle in .next/standalone so the Docker
  // runtime image ships only the files it needs, not all of node_modules.
  output: "standalone",

  async rewrites() {
    if (!API_PROXY_TARGET) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_PROXY_TARGET}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
