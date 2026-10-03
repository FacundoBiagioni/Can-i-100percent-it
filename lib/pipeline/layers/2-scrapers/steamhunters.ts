import { getOrFetchWithTtl } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { steamHuntersAppResponseSchema } from "@/lib/validation/schemas";
import type { EvidenceClaim } from "../../types";
import type { ScraperAdapter } from "./types";

type SteamHuntersApp = { found: true; hasPaidDlc: boolean } | { found: false };

/**
 * steamhunters.com's HTML pages sit behind a Cloudflare JS challenge, but its
 * JSON API route (/api/apps/{appId}) answers plain requests (verified live
 * 2026-10-02). The one fact used from it is hasPaidDlc: SteamHunters'
 * curated answer to "does 100% need paid DLC?", which is what lets the DLC
 * resolver rule out every DLC at once for games whose DLC adds no
 * achievements (see resolveRequiredDlc).
 */
async function fetchSteamHuntersApp(appId: number): Promise<SteamHuntersApp | null> {
  return getOrFetchWithTtl(
    CacheKeys.scrape("steamhunters:app", appId),
    async () => {
      const res = await fetch(`https://steamhunters.com/api/apps/${appId}`, {
        headers: { "User-Agent": "can-i-100-it/1.0" },
      });
      if (res.status === 404) return { found: false } as const; // not tracked by SteamHunters
      if (!res.ok) return null;
      const parsed = steamHuntersAppResponseSchema.safeParse(await res.json());
      return parsed.success ? ({ found: true, hasPaidDlc: parsed.data.hasPaidDlc } as const) : null;
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
      return [
        {
          sourceKey: "steamhunters",
          claim: { type: "paid_dlc_required", value: app.hasPaidDlc },
          confidence: "high",
          reasoning: app.hasPaidDlc
            ? "SteamHunters' curated data marks this game as needing paid DLC for 100%."
            : "SteamHunters' curated data marks this game as reachable to 100% without any paid DLC.",
          rawUrl: `https://steamhunters.com/apps/${appId}`,
          checkedAt: new Date(),
        },
      ];
    } catch {
      return [];
    }
  },
};
