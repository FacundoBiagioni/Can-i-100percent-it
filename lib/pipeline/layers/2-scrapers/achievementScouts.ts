import { getOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import {
  scoutStatsResponseSchema,
  communityTagsResponseSchema,
  steamHuntersPlayersResponseSchema,
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

/** Achievement Scouts proxies SteamHunters' own per-player data — this is
 * the only path we have to any SteamHunters signal, since steamhunters.com
 * itself is behind a Cloudflare challenge we can't pass with a plain fetch. */
async function fetchSteamHuntersSample(appId: number) {
  return getOrFetch(
    CacheKeys.scrape("achievement_scouts:steamhunters_players", appId),
    CacheTTL.scrapeSuccess,
    async () => {
      const res = await fetch(`${API_BASE}/steamhunters/apps/${appId}/players?page=1&limit=20`);
      if (!res.ok) return [];
      const parsed = steamHuntersPlayersResponseSchema.safeParse(await res.json());
      return parsed.success ? parsed.data.items : [];
    },
  );
}

export const achievementScoutsAdapter: ScraperAdapter = {
  source: "achievement_scouts",

  async fetchGameData(appId: number): Promise<EvidenceClaim[]> {
    const checkedAt = new Date();
    const claims: EvidenceClaim[] = [];

    try {
      const [stats, tags, huntersSample] = await Promise.all([
        fetchScoutStats(appId),
        fetchCommunityTags(appId),
        fetchSteamHuntersSample(appId),
      ]);

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

      const brokenReports = huntersSample.filter((p) => p.unlocked_broken > 0).length;
      if (huntersSample.length > 0 && brokenReports > 0) {
        claims.push({
          sourceKey: "achievement_scouts",
          claim: { type: "bugged_achievements_reported", sampledPlayers: huntersSample.length, brokenReports },
          confidence: "low", // inferred from a sample of top completers, not exhaustive
          reasoning: `${brokenReports} of ${huntersSample.length} sampled SteamHunters completers report broken achievement unlocks (data proxied via Achievement Scouts)`,
          checkedAt,
        });
      }
    } catch {
      // Undocumented internal API — degrade to no claims rather than fail the pipeline.
      return [];
    }

    return claims;
  },
};
