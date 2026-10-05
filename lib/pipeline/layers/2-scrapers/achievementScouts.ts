import { getOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import {
  scoutStatsResponseSchema,
  communityTagsResponseSchema,
  curationsResponseSchema,
} from "@/lib/validation/schemas";
import type { EvidenceClaim } from "../../types";
import type { ScraperAdapter } from "./types";

const API_BASE = "https://achievement-scouts.com/api/v1";

// Tags whose is_applied:true directly maps to a Fact our rule engine reads.
// Everything else in the taxonomy is still surfaced as a generic claim for
// the evidence panel, just not specifically mapped.
const MULTIPLAYER_TAG_SLUGS = ["mp-required", "online-required"];
const DLC_TAG_SLUGS = ["dlc-required", "depot-required"];

async function fetchScoutStats(appId: number) {
  return getOrFetch(
    CacheKeys.scrape("achievement_scouts:stats", appId),
    CacheTTL.scrapeSuccess,
    async () => {
      const res = await fetch(`${API_BASE}/apps/${appId}/scout-stats`);
      if (!res.ok) return null;
      const parsed = scoutStatsResponseSchema.safeParse(await res.json());
      return parsed.success ? parsed.data : null;
    },
  );
}

async function fetchCommunityTags(appId: number) {
  return getOrFetch(
    CacheKeys.scrape("achievement_scouts:tags", appId),
    CacheTTL.scrapeSuccess,
    async () => {
      const res = await fetch(`${API_BASE}/apps/${appId}/community-tags`);
      if (!res.ok) return [];
      const parsed = communityTagsResponseSchema.safeParse(await res.json());
      return parsed.success ? parsed.data : [];
    },
  );
}

/** Short human-written notes from the Achievement Scouts Steam curator
 * groups — e.g. "Paid 'Phantom Liberty' DLC required." or "No DLCs
 * required." The most explicit DLC statement available for a game, so the
 * DLC resolver treats it as authoritative context. */
async function fetchCurations(appId: number) {
  return getOrFetch(CacheKeys.scrape("achievement_scouts:curations", appId), CacheTTL.scrapeSuccess, async () => {
    const res = await fetch(`${API_BASE}/curations/by-app/${appId}`);
    if (!res.ok) return [];
    const parsed = curationsResponseSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : [];
  });
}

export const achievementScoutsAdapter: ScraperAdapter = {
  source: "achievement_scouts",

  async fetchGameData(appId: number): Promise<EvidenceClaim[]> {
    const checkedAt = new Date();
    const claims: EvidenceClaim[] = [];

    try {
      const [stats, tags, curations] = await Promise.all([
        fetchScoutStats(appId),
        fetchCommunityTags(appId),
        fetchCurations(appId),
      ]);

      for (const curation of curations) {
        if (!curation.blurb) continue;
        claims.push({
          sourceKey: "achievement_scouts",
          claim: { type: "curator_note", text: curation.blurb },
          confidence: "high",
          reasoning: curation.blurb,
          rawUrl: curation.curation_url ?? `https://achievement-scouts.com/apps/${appId}`,
          checkedAt,
        });
      }

      if (stats?.median_completion) {
        claims.push({
          sourceKey: "achievement_scouts",
          claim: { type: "estimated_hours", value: stats.median_completion / 60 },
          confidence: stats.completers >= 10 ? "medium" : "low",
          reasoning: `Median completion time across ${stats.completers} scouts who finished the game`,
          rawUrl: `https://achievement-scouts.com/apps/${appId}`,
          checkedAt,
        });
      }

      for (const tag of tags) {
        if (!tag.is_applied) continue;
        const confidence = tag.vote_count >= 5 ? "high" : tag.vote_count >= 2 ? "medium" : "low";

        if (MULTIPLAYER_TAG_SLUGS.includes(tag.slug)) {
          claims.push({
            sourceKey: "achievement_scouts",
            claim: { type: "multiplayer_required", value: true, tag: tag.slug },
            confidence,
            reasoning: `Community tag "${tag.name}" (${tag.vote_count} votes)`,
            rawUrl: `https://achievement-scouts.com/apps/${appId}`,
            checkedAt,
          });
        } else if (DLC_TAG_SLUGS.includes(tag.slug)) {
          claims.push({
            sourceKey: "achievement_scouts",
            claim: { type: "dlc_required", value: true, tag: tag.slug },
            confidence,
            reasoning: `Community tag "${tag.name}" (${tag.vote_count} votes)`,
            rawUrl: `https://achievement-scouts.com/apps/${appId}`,
            checkedAt,
          });
        } else {
          claims.push({
            sourceKey: "achievement_scouts",
            claim: { type: "community_tag", slug: tag.slug, name: tag.name },
            confidence,
            reasoning: `Community tag "${tag.name}" (${tag.vote_count} votes)`,
            rawUrl: `https://achievement-scouts.com/apps/${appId}`,
            checkedAt,
          });
        }
      }

    } catch {
      // Undocumented internal API — degrade to no claims rather than fail the pipeline.
      return [];
    }

    return claims;
  },
};
