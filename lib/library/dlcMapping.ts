import { redis } from "@/lib/cache/redis";
import { getOrCreateGame, getAchievementsForGame } from "@/lib/db/queries/games";
import { hasDlcAnswer, saveDlcMapping } from "@/lib/db/queries/analysis";
import { getAppDetails } from "@/lib/pipeline/layers/1-steam/client";
import { getDlcCatalog } from "@/lib/steam/dlcCatalog";
import { resolveRequiredDlc } from "@/lib/pipeline/dlc/resolveRequiredDlc";
import { steamHuntersAdapter } from "@/lib/pipeline/layers/2-scrapers/steamhunters";
import { achievementScoutsAdapter } from "@/lib/pipeline/layers/2-scrapers/achievementScouts";

/** AI mappings allowed per UTC day, so a few big libraries can't use up the
 * free Gemini quota the game pages also run on. */
export const DAILY_MAPPING_LIMIT = 100;

/** Answers the pipeline can stand behind; anything else (Gemini down, DLC
 * not identified) is left unsaved so a later check tries again. */
const DEFINITIVE = new Set(["ai_mapped", "steamhunters_none", "no_dlc"]);

export type MappingOutcome = "mapped" | "already_known" | "daily_limit" | "busy" | "failed";

/**
 * Just the DLC step of the pipeline, for a game nobody has analyzed yet:
 * which DLC 100% needs and which achievements each one gates. Same resolver
 * and inputs the full analysis uses (SteamHunters, curator notes, the real
 * achievement and DLC lists), minus the forum/guide reads, so it costs one
 * AI call instead of several. Saved for good, so each game is mapped once.
 */
export async function mapRequiredDlc(appId: number): Promise<MappingOutcome> {
  if (await hasDlcAnswer(appId)) return "already_known";

  // Two tabs on the same library shouldn't map the same game twice.
  if (redis && !(await redis.set(`dlcmap:lock:${appId}`, 1, { nx: true, ex: 120 }))) return "busy";
  try {
    const details = await getAppDetails(appId);
    if (!details) return "failed";
    const catalog = await getDlcCatalog(appId, details.dlcAppIds);
    if (!catalog) return "failed";

    await getOrCreateGame(appId);
    const achievementRows = await getAchievementsForGame(appId);
    if (achievementRows.length === 0) return "failed";

    const claims = (
      await Promise.all([steamHuntersAdapter.fetchGameData(appId, details.name), achievementScoutsAdapter.fetchGameData(appId, details.name)])
    ).flat();

    if (redis) {
      const key = `dlcmap:day:${new Date().toISOString().slice(0, 10)}`;
      const used = await redis.incr(key);
      if (used === 1) await redis.expire(key, 60 * 60 * 48);
      if (used > DAILY_MAPPING_LIMIT) return "daily_limit";
    }

    const resolution = await resolveRequiredDlc(
      details.name,
      catalog.map((d) => ({ appId: d.appId, name: d.name, description: d.description })),
      achievementRows.map((a) => ({
        name: a.displayName,
        description: a.description,
        unlockPercent: a.globalUnlockPercent !== null ? Number(a.globalUnlockPercent) : null,
      })),
      claims,
    );
    const method = String(resolution.claim.claim.method);
    if (!DEFINITIVE.has(method)) return "failed";

    const byId = new Map(catalog.map((d) => [d.appId, d]));
    await saveDlcMapping(
      appId,
      [...resolution.required].map(([dlcAppId, evidence]) => {
        const d = byId.get(dlcAppId);
        return {
          dlcAppId,
          name: d?.name ?? `DLC ${dlcAppId}`,
          priceCents: null,
          required: true,
          isDelisted: d ? !d.exists || !d.purchasable : false,
          evidence,
        };
      }),
      method,
    );
    return "mapped";
  } finally {
    if (redis) await redis.del(`dlcmap:lock:${appId}`);
  }
}
