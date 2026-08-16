import path from "node:path";
import type { NextConfig } from "next";

// Security headers (CSP, X-Frame-Options, etc.) live in proxy.ts instead of here — CSP's
// script-src needs a fresh per-request nonce, which only middleware can generate, and
// splitting the headers across two mechanisms risks duplicate/conflicting
// Content-Security-Policy headers on the same response.
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
