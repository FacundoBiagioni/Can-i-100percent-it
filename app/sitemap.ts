import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { analysisResults } from "@/lib/db/schema";

const SITE = "https://can-i-100-it.vercel.app";

// Rebuilt at most once a day: new analyses join the list on their own.
export const revalidate = 86400;

/** The fixed pages plus every game that already has a verdict (pages for
 * games never checked would start an analysis when crawled). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = await db
    .select({ id: analysisResults.gameId, at: analysisResults.computedAt })
    .from(analysisResults)
    .catch(() => []);
  return [
    { url: SITE, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/library`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/how-it-works`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.4 },
    ...games.map((g) => ({ url: `${SITE}/games/${g.id}`, lastModified: g.at, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
