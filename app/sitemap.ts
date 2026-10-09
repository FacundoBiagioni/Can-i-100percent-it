import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { analysisResults } from "@/lib/db/schema";
import { getList, LIST_SLUGS, MIN_INDEXABLE } from "@/lib/lists/lists";

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
  const lists = await Promise.all(
    LIST_SLUGS.map(async (slug) => ({ slug, size: (await getList(slug).catch(() => [])).length })),
  );
  return [
    { url: SITE, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/library`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/lists`, changeFrequency: "weekly", priority: 0.7 },
    // Near-empty lists are noindex until they fill up; leave them out too.
    ...lists
      .filter((l) => l.size >= MIN_INDEXABLE)
      .map((l) => ({ url: `${SITE}/lists/${l.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    { url: `${SITE}/how-it-works`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...games.map((g) => ({ url: `${SITE}/games/${g.id}`, lastModified: g.at, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
