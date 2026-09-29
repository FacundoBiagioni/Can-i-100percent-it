import { redis, acquireLock, releaseLock } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { getAnalysisResult } from "@/lib/db/queries/analysis";
import { getOrCreateGame } from "@/lib/db/queries/games";
import { runPipeline } from "./orchestrator";
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
