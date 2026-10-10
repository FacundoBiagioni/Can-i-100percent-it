import type { NextConfig } from "next";

// Baseline security headers on every response. (Vercel already adds HSTS.)
// The Content-Security-Policy is set per request in proxy.ts: it carries a
// fresh nonce for each page view, which a static header can't.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  images: {
    // Steam's CDN hostnames observed across header images, screenshots,
    // background art, capsule thumbnails, and achievement icons.
    remotePatterns: [
      { protocol: "https", hostname: "**.steamstatic.com" },
      { protocol: "https", hostname: "**.akamaihd.net" },
    ],
  },
};

export default nextConfig;
