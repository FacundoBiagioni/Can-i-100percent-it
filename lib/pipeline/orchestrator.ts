import { redis } from "@/lib/cache/redis";
import { CacheKeys } from "@/lib/cache/keys";
import { upsertAnalysisResult, insertVerificationHistory } from "@/lib/db/queries/analysis";
import { insertEvidence } from "@/lib/db/queries/evidence";
import { getAchievementsForGame } from "@/lib/db/queries/games";
import { steamAnalyzer } from "./layers/1-steam/client";
import { runAllScrapers } from "./layers/2-scrapers";
import { applyRules, detectConflicts, deriveStatus } from "./layers/3-rules/engine";
import { applyRecencyDecay } from "./layers/4-recency/scorer";
import { fetchAcceptedCommunityClaims } from "./layers/5-community/reports";
import { resolveConflicts } from "./layers/6-ai-resolver/resolver";
import { matchAchievementName } from "./achievementMatcher";
import { matchDlcName } from "./dlcMatcher";
import type { AnalysisResult, EvidenceClaim, DlcRequirement } from "./types";

export const PIPELINE_VERSION = "1";

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
  const dlcNeeded = steamResult.dlcNeeded ?? [];
  const multiplayerFromSteam = steamResult.multiplayerRequired ?? false;

  let allClaims: EvidenceClaim[] = [...steamResult.claims];

  if (foundOnSteam) {
    const [scraperClaims, communityClaims] = await Promise.all([
      runAllScrapers(appId, gameName),
      fetchAcceptedCommunityClaims(appId),
    ]);
    allClaims = [...allClaims, ...scraperClaims, ...communityClaims];

    // AI-extracted "achievement_unobtainable" claims only carry the
    // free-text name a source used — resolve it to a real achievement now
    // that the game's own list is available, so layer 3 and the detail
    // view can attribute the claim to a specific achievement record.
    const achievementRows = await getAchievementsForGame(appId);
    if (achievementRows.length > 0) {
      allClaims = allClaims.map((c) => {
        if (c.claim.type !== "achievement_unobtainable" || c.achievementApiName) return c;
        const name = c.claim.name;
        if (typeof name !== "string") return c;
        const matched = matchAchievementName(name, achievementRows);
        return matched ? { ...c, achievementApiName: matched.apiName } : c;
      });
    }

    // Same idea as above, but for "dlc_achievement_requirement" claims —
    // sources only ever name a DLC by its store title, so resolve that
    // free text against this game's actual owned-DLC list (from layer 1)
    // now that it's available.
    if (dlcNeeded.length > 0) {
      allClaims = allClaims.map((c) => {
        if (c.claim.type !== "dlc_achievement_requirement" || c.dlcAppId) return c;
        const name = c.claim.name;
        if (typeof name !== "string") return c;
        const matched = matchDlcName(name, dlcNeeded);
        return matched ? { ...c, dlcAppId: matched.dlcAppId } : c;
      });
    }
  }

  allClaims = applyRecencyDecay(allClaims);

  let facts = buildFacts(appId, gameName, foundOnSteam, dlcNeeded, multiplayerFromSteam, allClaims);

  let aiUsed = false;
  const conflicts = detectConflicts(allClaims);
  if (conflicts.length > 0) {
    const resolutions = await resolveConflicts(gameName, conflicts);
    if (resolutions.length > 0) {
      aiUsed = true;
      const resolvedClaims: EvidenceClaim[] = resolutions.map((r) => ({
        sourceKey: "ai_resolver",
        claim: { type: r.key.split(":")[0], value: r.resolvedValue },
        confidence: r.confidence,
        reasoning: r.reasoning,
        checkedAt: new Date(),
      }));
      allClaims = [...allClaims, ...resolvedClaims];
      facts = buildFacts(appId, gameName, foundOnSteam, dlcNeeded, multiplayerFromSteam, allClaims);
    }
  }

  const { status, confidence, reasoning } = deriveStatus(facts, aiUsed);

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
  if (redis) await redis.del(CacheKeys.analysis(appId));

  return result;
}
