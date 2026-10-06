import { redis } from "@/lib/cache/redis";
import { CacheKeys } from "@/lib/cache/keys";
import {
  upsertAnalysisResult,
  insertVerificationHistory,
  getRequiredDlcByGame,
  markForRecheck,
} from "@/lib/db/queries/analysis";
import { insertEvidence, getStoredClaims } from "@/lib/db/queries/evidence";
import { getAchievementsForGame, getOrCreateGame } from "@/lib/db/queries/games";
import { steamAnalyzer, getAppDetails } from "./layers/1-steam/client";
import { getDlcCatalog } from "@/lib/steam/dlcCatalog";
import { resolveRequiredDlc } from "./dlc/resolveRequiredDlc";
import { unlistedDlcRequirement } from "./dlc/unlisted";
import { runAllScrapers } from "./layers/2-scrapers";
import { applyRules, deriveStatus, steamHuntersTracks } from "./layers/3-rules/engine";
import { applyRecencyDecay } from "./layers/4-recency/scorer";
import { fetchAcceptedCommunityClaims } from "./layers/5-community/reports";
import { matchAchievementName } from "./achievementMatcher";
import type { AnalysisResult, EvidenceClaim, DlcRequirement } from "./types";

export const PIPELINE_VERSION = "2";

type Trigger = "initial" | "manual" | "cron";

function buildFacts(
  appId: number,
  gameName: string,
  foundOnSteam: boolean,
  dlcNeeded: DlcRequirement[],
  multiplayerRequired: boolean,
  claims: EvidenceClaim[],
) {
  return applyRules({ gameId: appId, gameName, foundOnSteam, dlcNeeded, multiplayerRequired }, claims);
}

export async function runPipeline(appId: number, trigger: Trigger = "manual"): Promise<AnalysisResult> {
  const startedAt = new Date();

  const steamResult = await steamAnalyzer.run({ appId, gameName: "" });
  const gameName = steamResult.gameName ?? `AppID ${appId}`;
  const foundOnSteam = steamResult.foundOnSteam ?? false;
  let dlcNeeded = steamResult.dlcNeeded ?? [];
  const multiplayerFromSteam = steamResult.multiplayerRequired ?? false;

  let allClaims: EvidenceClaim[] = [...steamResult.claims];
  // Set when some AI step couldn't run and older findings stood in for it.
  let partial = false;

  if (foundOnSteam) {
    // An app with zero achievements has nothing for this whole pipeline to
    // check — short-circuit before spending any scraper/AI calls on it and
    // report it as its own distinct status rather than a green/red verdict
    // that wouldn't mean anything (100% of nothing).
    // getOrCreateGame backfills a game whose achievements were never stored
    // (rows from before achievement persistence existed). Without it, a run
    // that doesn't come through the game page — the daily cron, a manual
    // re-run — read zero rows and reported a game like Stardew Valley as
    // having no achievements at all.
    await getOrCreateGame(appId);
    const achievementRows = await getAchievementsForGame(appId);
    if (achievementRows.length === 0) {
      const result: AnalysisResult = {
        gameId: appId,
        status: "no_achievements",
        confidence: "high",
        dlcRequired: [],
        totalDlcCostCents: 0,
        multiplayerRequired: false,
        minPlayers: null,
        serversStatus: "online",
        missableAchievementCount: 0,
        buggedAchievementCount: 0,
        unobtainableAchievementCount: 0,
        estimatedHours: null,
        reasoning: "This app has no Steam achievements to track.",
        aiUsed: false,
      };
      await upsertAnalysisResult(result);
      await insertVerificationHistory(appId, result, trigger, PIPELINE_VERSION, startedAt);
      if (redis) await redis.del(CacheKeys.analysis(appId));
      return result;
    }

    const [scraperClaims, communityClaims] = await Promise.all([
      runAllScrapers(appId, gameName),
      fetchAcceptedCommunityClaims(appId),
    ]);
    // A source whose text couldn't be read this run (AI quota out, Gemini
    // down) keeps what it said last time instead of silently dropping it,
    // and the game is queued to be read again once the AI is back.
    const unread = [...new Set(scraperClaims.filter((c) => c.claim.type === "reading_unavailable").map((c) => c.sourceKey))];
    if (unread.length > 0) partial = true;
    const carriedOver = await getStoredClaims(appId, unread);
    allClaims = [...allClaims, ...scraperClaims.filter((c) => c.claim.type !== "reading_unavailable"), ...carriedOver, ...communityClaims];
    // SteamHunters' curated list decides which achievements are unobtainable
    // when it tracks the game; AI reads of forum threads naming one (often a
    // one-save lockout, an old bug, or a pre-relaunch list) would otherwise
    // show up in the detail sheet contradicting it.
    if (steamHuntersTracks(allClaims)) {
      allClaims = allClaims.filter((c) => c.claim.type !== "achievement_unobtainable" || c.sourceKey === "steamhunters");
    }

    // AI-extracted "achievement_unobtainable"/"missable" claims only carry
    // the free-text name a source used — resolve it to a real achievement
    // now that the game's own list is available, so layer 3 and the detail
    // view can attribute the claim to a specific achievement record.
    const NAMED_ACHIEVEMENT_CLAIM_TYPES = new Set(["achievement_unobtainable", "missable"]);
    allClaims = allClaims.map((c) => {
      if (typeof c.claim.type !== "string" || !NAMED_ACHIEVEMENT_CLAIM_TYPES.has(c.claim.type) || c.achievementApiName) {
        return c;
      }
      const name = c.claim.name;
      if (typeof name !== "string") return c;
      const matched = matchAchievementName(name, achievementRows);
      return matched ? { ...c, achievementApiName: matched.apiName } : c;
    });

    // Which DLC 100% needs: SteamHunters gate, then a validated mapping of
    // the real achievement list onto the real DLC list (see
    // resolveRequiredDlc). The catalog is cached from layer 1's own lookup.
    if (dlcNeeded.length > 0) {
      const details = await getAppDetails(appId);
      const catalog = (details && (await getDlcCatalog(appId, details.dlcAppIds))) ?? [];
      const descriptions = new Map(catalog.map((d) => [d.appId, d.description]));
      // Only results from this resolver carry evidence; older ones (fuzzy
      // matching, blanket flags) aren't worth falling back to. A mapping
      // the library made on its own counts too.
      const stored = (await getRequiredDlcByGame([appId])).get(appId) ?? [];
      const previousMatched = stored.filter((d) => d.evidence && d.evidence.length > 0);
      const previous = previousMatched.length > 0 ? new Map(previousMatched.map((d) => [d.dlcAppId, d.evidence!])) : null;
      const resolution = await resolveRequiredDlc(
        gameName,
        dlcNeeded.map((d) => ({ appId: d.dlcAppId, name: d.name, description: descriptions.get(d.dlcAppId) ?? "" })),
        achievementRows.map((a) => ({
          name: a.displayName,
          description: a.description,
          unlockPercent: a.globalUnlockPercent !== null ? Number(a.globalUnlockPercent) : null,
        })),
        allClaims,
        previous,
      );
      allClaims = [...allClaims, resolution.claim];
      if (["ai_unavailable", "previous_result"].includes(String(resolution.claim.claim.method))) partial = true;
      // Paid DLC needed, but nothing listed can be bought: name no DLC, just
      // say it's no longer sold (see dlc/unlisted.ts).
      const unlisted = unlistedDlcRequirement(resolution.required, catalog, allClaims);
      if (unlisted) resolution.required.clear();
      // Prices aren't stored: they depend on the visitor's region and are
      // added when the result is shown (priceDlcForRegion).
      dlcNeeded = dlcNeeded.map((d) => {
        const evidence = resolution.required.get(d.dlcAppId);
        return evidence ? { ...d, required: true, evidence } : d;
      });
      if (unlisted) dlcNeeded = [...dlcNeeded, unlisted];
    }
  }

  allClaims = applyRecencyDecay(allClaims);

  const facts = buildFacts(appId, gameName, foundOnSteam, dlcNeeded, multiplayerFromSteam, allClaims);
  const { status, confidence, reasoning } = deriveStatus(facts);
  // AI took part in the verdict's inputs when it mapped achievements to DLC.
  const aiUsed = allClaims.some((c) => c.claim.type === "required_dlc_resolution" && c.claim.method === "ai_mapped");

  const result: AnalysisResult = {
    gameId: appId,
    status,
    confidence,
    dlcRequired: facts.dlcNeeded.filter((d) => d.required),
    totalDlcCostCents: facts.dlcNeeded
      .filter((d) => d.required)
      .reduce((sum, d) => sum + (d.priceCents ?? 0), 0),
    multiplayerRequired: facts.multiplayerRequired,
    minPlayers: facts.minPlayers,
    serversStatus: facts.serversStatus,
    missableAchievementCount: facts.missableAchievements.length,
    buggedAchievementCount: facts.buggedAchievements.length,
    unobtainableAchievementCount: facts.unobtainableAchievements.length,
    estimatedHours: facts.estimatedHours,
    reasoning,
    aiUsed,
  };

  await upsertAnalysisResult(result);
  await insertVerificationHistory(appId, result, trigger, PIPELINE_VERSION, startedAt);
  await insertEvidence(appId, allClaims);
  if (partial) await markForRecheck(appId);
  if (redis) await redis.del(CacheKeys.analysis(appId));

  return result;
}
