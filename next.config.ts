import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
