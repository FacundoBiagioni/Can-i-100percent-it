import type { EvidenceClaim } from "../../types";
import type { ScraperAdapter } from "./types";
import { achievementScoutsAdapter } from "./achievementScouts";
import { trueSteamAchievementsAdapter } from "./truesteamachievements";
import { steamHuntersAdapter } from "./steamhunters";
import { steamForumsAdapter } from "./steamForums";
import { steamGuidesAdapter } from "./steamGuides";
import { wikipediaAdapter } from "./wikipedia";

export const scraperAdapters: ScraperAdapter[] = [
  achievementScoutsAdapter,
  trueSteamAchievementsAdapter,
  steamHuntersAdapter,
  steamForumsAdapter,
  steamGuidesAdapter,
  wikipediaAdapter,
];

/** Runs every scraper in parallel; one adapter failing never blocks the others. */
export async function runAllScrapers(appId: number, gameName: string): Promise<EvidenceClaim[]> {
  const results = await Promise.allSettled(
    scraperAdapters.map((adapter) => adapter.fetchGameData(appId, gameName)),
  );

  const claims: EvidenceClaim[] = [];
  for (const [i, result] of results.entries()) {
    if (result.status === "fulfilled") {
      claims.push(...result.value);
    } else {
      claims.push({
        sourceKey: scraperAdapters[i].source,
        claim: { error: String(result.reason) },
        confidence: "low",
        checkedAt: new Date(),
      });
    }
  }
  return claims;
}
