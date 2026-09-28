import { redis, acquireLock, releaseLock } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { getOrCreateGame } from "@/lib/db/queries/games";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ appid: string }> },
) {
  const { appid } = await params;
  const appId = Number(appid);
  if (!Number.isInteger(appId) || appId <= 0) {
    return Response.json({ error: "invalid_appid" }, { status: 400 });
  }

  // analysis_results.game_id has a FK into games — must exist before the
  // pipeline can persist a result.
  const game = await getOrCreateGame(appId);
  if (!game) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const lockKey = CacheKeys.pipelineLock(appId);
  const acquired = await acquireLock(lockKey, CacheTTL.pipelineLock);
  if (!acquired) {
    return Response.json({ status: "already_running" }, { status: 409 });
  }

  try {
    const result = await runPipeline(appId, "manual");
    if (redis) await redis.set(CacheKeys.analysis(appId), result, { ex: CacheTTL.analysis });
    return Response.json({ analysis: result });
  } finally {
    await releaseLock(lockKey);
  }
}
