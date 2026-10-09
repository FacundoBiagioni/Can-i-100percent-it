import { aiCallsLeft } from "@/lib/ai/gemini";
import { redis } from "@/lib/cache/redis";
import { isCronRequest } from "@/lib/cron/auth";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { markPrefillFailed, selectPrefillGames } from "@/lib/pipeline/layers/7-cron/selectPrefillGames";

// Hobby's ceiling. A run stops starting new games well before it.
export const maxDuration = 300;
const STOP_STARTING_AFTER_MS = 200_000;
// Kept back for visitors until the quota resets, and for the 06:00 re-check.
const RESERVED_CALLS = 60;
// The most one analysis has used (DLC mapping + forum and guide readings).
const CALLS_PER_GAME = 8;
const BATCH = 40;
const LOCK_KEY = "prefill:lock";

/**
 * Analyzes popular games nobody has looked up yet with the Gemini quota the
 * day left over. Scheduled several times a night (Hobby crons run once a day
 * each and a function gets 5 minutes), in the last hours before the quota
 * resets at midnight Pacific; each run picks up where the last one stopped.
 */
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const left = await aiCallsLeft();
  if (left < RESERVED_CALLS + CALLS_PER_GAME) {
    return Response.json({ analyzed: 0, skipped: "no_spare_quota", callsLeft: left });
  }

  // Hobby fires a cron anywhere within its hour, so two nightly runs can
  // touch; only one works at a time.
  if (redis && !(await redis.set(LOCK_KEY, 1, { nx: true, ex: maxDuration }))) {
    return Response.json({ analyzed: 0, skipped: "already_running" });
  }

  const queue = await selectPrefillGames(BATCH);
  const results: { appId: number; status: string }[] = [];
  for (const appId of queue) {
    if (Date.now() - started > STOP_STARTING_AFTER_MS) break;
    if ((await aiCallsLeft()) < RESERVED_CALLS + CALLS_PER_GAME) break;
    try {
      const result = await runPipeline(appId, "cron");
      results.push({ appId, status: result.status });
    } catch (err) {
      await markPrefillFailed(appId);
      results.push({ appId, status: `error: ${err instanceof Error ? err.message : "unknown"}` });
    }
  }

  if (redis) await redis.del(LOCK_KEY);
  return Response.json({ analyzed: results.length, callsLeft: await aiCallsLeft(), results });
}
