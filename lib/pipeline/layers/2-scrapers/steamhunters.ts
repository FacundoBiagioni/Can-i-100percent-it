import { getOrFetchWithTtl } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { steamHuntersAppResponseSchema, steamHuntersAchievementsResponseSchema } from "@/lib/validation/schemas";
import type { EvidenceClaim } from "../../types";
import type { ScraperAdapter } from "./types";

const UNOBTAINABLE = 3;

type SteamHuntersApp =
  | { found: true; hasPaidDlc: boolean; unobtainableCount: number; unobtainable: { apiName: string; name: string }[] }
  | { found: false };

/**
 * steamhunters.com's HTML pages sit behind a Cloudflare JS challenge, but its
 * JSON API routes answer plain requests (verified live 2026-10-02/04).
 * SteamHunters is a community-curated achievement database; two of its facts
 * drive verdicts here:
 * - hasPaidDlc — does 100% need paid DLC (see resolveRequiredDlc)
 * - which achievements are unobtainable today (servers shut down, removed
 *   content, ended events) — the one deterministic answer to "is 100%
 *   impossible?", unlike AI reads of forum threads, which flip between runs.
 */
async function fetchSteamHuntersApp(appId: number): Promise<SteamHuntersApp | null> {
  return getOrFetchWithTtl(
    CacheKeys.scrape("steamhunters:app:v2", appId),
    async () => {
      const headers = { "User-Agent": "can-i-100-it/1.0" };
      const res = await fetch(`https://steamhunters.com/api/apps/${appId}`, { headers });
      if (res.status === 404) return { found: false } as const; // not tracked by SteamHunters
      if (!res.ok) return null;
      const app = steamHuntersAppResponseSchema.safeParse(await res.json());
      if (!app.success) return null;

      let unobtainable: { apiName: string; name: string }[] = [];
      if (app.data.unobtainableAchievementCount > 0) {
        const achRes = await fetch(`https://steamhunters.com/api/apps/${appId}/achievements`, { headers });
        if (!achRes.ok) return null;
        const achievements = steamHuntersAchievementsResponseSchema.safeParse(await achRes.json());
        if (!achievements.success) return null;
        unobtainable = achievements.data
          .filter((a) => a.obtainability === UNOBTAINABLE)
          .map((a) => ({ apiName: a.apiName, name: a.name.trim() }));
      }
      return {
        found: true,
        hasPaidDlc: app.data.hasPaidDlc,
        unobtainableCount: app.data.unobtainableAchievementCount,
        unobtainable,
      } as const;
    },
    (result) => (result ? CacheTTL.scrapeSuccess : CacheTTL.failureRetry),
  );
}

export const steamHuntersAdapter: ScraperAdapter = {
  source: "steamhunters",

  async fetchGameData(appId: number): Promise<EvidenceClaim[]> {
    try {
      const app = await fetchSteamHuntersApp(appId);
      if (!app?.found) return [];
      const checkedAt = new Date();
      const rawUrl = `https://steamhunters.com/apps/${appId}/achievements`;
      const claims: EvidenceClaim[] = [
        {
          sourceKey: "steamhunters",
          claim: { type: "paid_dlc_required", value: app.hasPaidDlc },
          confidence: "high",
          reasoning: app.hasPaidDlc
            ? "SteamHunters' curated data marks this game as needing paid DLC for 100%."
            : "SteamHunters' curated data marks this game as reachable to 100% without any paid DLC.",
          rawUrl: `https://steamhunters.com/apps/${appId}`,
          checkedAt,
        },
        {
          // Its presence also means "SteamHunters tracks this game", which
          // makes its unobtainable list authoritative for the verdict.
          sourceKey: "steamhunters",
          claim: { type: "unobtainable_count", value: app.unobtainableCount },
          confidence: "high",
          reasoning:
            app.unobtainableCount > 0
              ? `SteamHunters marks ${app.unobtainableCount} achievement${app.unobtainableCount === 1 ? "" : "s"} as no longer obtainable.`
              : "SteamHunters marks every achievement as obtainable.",
          rawUrl,
          checkedAt,
        },
      ];
      for (const a of app.unobtainable) {
        claims.push({
          sourceKey: "steamhunters",
          achievementApiName: a.apiName,
          claim: { type: "achievement_unobtainable", name: a.name },
          confidence: "high",
          reasoning: "Marked as no longer obtainable in its community-curated achievement list.",
          rawUrl,
          checkedAt,
        });
      }
      return claims;
    } catch {
      return [];
    }
  },
};
