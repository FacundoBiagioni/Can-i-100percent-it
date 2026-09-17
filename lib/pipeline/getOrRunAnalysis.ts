import { redis, acquireLock, releaseLock } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { getAnalysisResult } from "@/lib/db/queries/analysis";
import { runPipeline } from "./orchestrator";
import type { AnalysisResult } from "./types";

export type AnalysisOutcome = { state: "ready"; analysis: AnalysisResult } | { state: "pending" };

/** Shared by the analysis API route and the game page RSC — same cache/lock semantics either way. */
export async function getOrRunAnalysis(appId: number): Promise<AnalysisOutcome> {
  const cacheKey = CacheKeys.analysis(appId);
  const cached = redis ? await redis.get<AnalysisResult>(cacheKey) : null;
  if (cached) return { state: "ready", analysis: cached };

  const existing = await getAnalysisResult(appId);
  if (existing) {
    if (redis) await redis.set(cacheKey, existing, { ex: CacheTTL.analysis });
    return { state: "ready", analysis: existing };
  }

  const lockKey = CacheKeys.pipelineLock(appId);
  const acquired = await acquireLock(lockKey, CacheTTL.pipelineLock);
  if (!acquired) return { state: "pending" };

  try {
    const result = await runPipeline(appId, "initial");
    if (redis) await redis.set(cacheKey, result, { ex: CacheTTL.analysis });
    return { state: "ready", analysis: result };
  } finally {
    await releaseLock(lockKey);
  }
}
