import type { NextConfig } from "next";

// Baseline security headers on every response. (Vercel already adds HSTS.)
// No full Content-Security-Policy yet: Next's inline scripts would need
// nonces; frame-ancestors alone stops the site being framed (clickjacking).
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
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
