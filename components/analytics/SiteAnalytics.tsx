"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics: page views only, no cookies. The admin panel is
 * never sent (its address holds the secret key), and query strings are
 * dropped so nothing a visitor typed reaches the stats.
 */
export default function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        if (url.pathname.startsWith("/admin")) return null;
        url.search = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
