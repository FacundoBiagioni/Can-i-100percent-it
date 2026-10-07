import type { MetadataRoute } from "next";

const SITE = "https://can-i-100-it.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    // The API is for the site's own pages; crawling it would only spend
    // Steam and AI quota.
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
