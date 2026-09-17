import type { EvidenceClaim } from "../../types";
import type { ScraperAdapter } from "./types";

/**
 * Stubbed — truesteamachievements.com sits behind a Cloudflare JS challenge
 * that a plain fetch can't pass (verified 2026-09-16: every request returns
 * the "Just a moment..." challenge page, no real HTML). A headless browser
 * could pass it interactively, but isn't viable for an automated cron
 * hitting the same host repeatedly from a datacenter IP. Returns no claims
 * rather than attempting a request that will never succeed.
 */
export const trueSteamAchievementsAdapter: ScraperAdapter = {
  source: "truesteamachievements",
  async fetchGameData(): Promise<EvidenceClaim[]> {
    return [];
  },
};
