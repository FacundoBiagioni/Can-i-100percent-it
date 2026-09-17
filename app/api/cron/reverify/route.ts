import { type NextRequest } from "next/server";
import { selectStaleGames } from "@/lib/pipeline/layers/7-cron/selectStaleGames";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { redis } from "@/lib/cache/redis";
import { CacheKeys } from "@/lib/cache/keys";

// Processes up to 10 games sequentially (Steam + scraper + occasional AI
// calls each) — generous headroom under Vercel's default budget.
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret") ?? request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const staleAppIds = await selectStaleGames();
  const results: { appId: number; status: string }[] = [];

  for (const appId of staleAppIds) {
    try {
      const result = await runPipeline(appId, "cron");
      if (redis) await redis.del(CacheKeys.analysis(appId));
      results.push({ appId, status: result.status });
    } catch (err) {
      results.push({ appId, status: `error: ${err instanceof Error ? err.message : "unknown"}` });
    }
  }

  return Response.json({ checked: results.length, results });
}
