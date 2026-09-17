import type { EvidenceClaim } from "../../types";
import type { ScraperAdapter } from "./types";

/**
 * Stubbed — steamhunters.com itself sits behind a Cloudflare JS challenge
 * (verified 2026-09-16, same as truesteamachievements.com). We still get a
 * partial SteamHunters signal indirectly: achievementScoutsAdapter proxies
 * a sample of SteamHunters player data through achievement-scouts.com's own
 * API. This adapter is kept as an explicit no-op (rather than removed) so
 * the registry entry and source_key stay self-documenting if a direct path
 * ever becomes viable.
 */
export const steamHuntersAdapter: ScraperAdapter = {
  source: "steamhunters",
  async fetchGameData(): Promise<EvidenceClaim[]> {
    return [];
  },
};
