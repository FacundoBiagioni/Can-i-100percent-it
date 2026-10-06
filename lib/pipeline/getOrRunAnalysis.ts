import { redis, acquireLock, releaseLock } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { getAnalysisResult } from "@/lib/db/queries/analysis";
import { getOrCreateGame } from "@/lib/db/queries/games";
import { runPipeline } from "./orchestrator";
import { getRegionalPrices } from "@/lib/pricing/steamPrices";
import type { AnalysisResult } from "./types";

export type AnalysisOutcome =
  | { state: "ready"; analysis: AnalysisResult }
  | { state: "pending" }
  | { state: "not_found" };

/**
 * Read-only, no pipeline trigger — used by the page RSC to decide whether it
 * can render the result immediately (already analyzed) or has to hand off to
 * the client-side poller (first-time analysis, which can take several
 * seconds and shouldn't block the page response).
 */
export async function getCachedAnalysis(appId: number): Promise<AnalysisResult | null> {
  const cacheKey = CacheKeys.analysis(appId);
  const cached = redis ? await redis.get<AnalysisResult>(cacheKey) : null;
  if (cached) return cached;

  const existing = await getAnalysisResult(appId);
  if (existing && redis) await redis.set(cacheKey, existing, { ex: CacheTTL.analysis });
  return existing;
}

/**
 * Prices a result's required DLC in one Steam store (the visitor's region):
 * stored results carry no prices, since they're shared by everyone. One
 * batched, cached lookup for all the game's required DLC. A DLC Steam
 * doesn't sell on its own there stays null ("Not sold alone").
 */
export async function priceDlcForRegion(analysis: AnalysisResult, cc: string): Promise<AnalysisResult> {
  const priced = analysis.dlcRequired.filter((d) => !d.unlisted);
  if (priced.length === 0) return analysis;
  const prices = await getRegionalPrices(
    priced.map((d) => d.dlcAppId),
    cc,
  );
  const dlcRequired = analysis.dlcRequired.map((d) => {
    if (d.unlisted) return d;
    const p = prices.get(d.dlcAppId);
    return { ...d, priceCents: p ? (p.isFree ? 0 : p.priceCents) : null };
  });
  return {
    ...analysis,
    dlcRequired,
    totalDlcCostCents: dlcRequired.filter((d) => d.required).reduce((sum, d) => sum + (d.priceCents ?? 0), 0),
  };
}

/** Shared by the analysis API route and the game page RSC — same cache/lock semantics either way. */
export async function getOrRunAnalysis(appId: number): Promise<AnalysisOutcome> {
  const cached = await getCachedAnalysis(appId);
  if (cached) return { state: "ready", analysis: cached };

  // analysis_results.game_id has a FK into games — the row must exist
  // before the pipeline can persist anything, regardless of whether the
  // caller arrived via the page (which already does this) or hit the API
  // route directly.
  const game = await getOrCreateGame(appId);
  if (!game) return { state: "not_found" };

  const lockKey = CacheKeys.pipelineLock(appId);
  const acquired = await acquireLock(lockKey, CacheTTL.pipelineLock);
  if (!acquired) return { state: "pending" };

  try {
    const result = await runPipeline(appId, "initial");
    if (redis) await redis.set(CacheKeys.analysis(appId), result, { ex: CacheTTL.analysis });
    return { state: "ready", analysis: result };
  } finally {
    await releaseLock(lockKey);
  }
}
