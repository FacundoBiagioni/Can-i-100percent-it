import { type NextRequest } from "next/server";
import { selectStaleGames } from "@/lib/pipeline/layers/7-cron/selectStaleGames";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { aiExhausted } from "@/lib/ai/gemini";
import { purgeReportEmails } from "@/lib/db/queries/reports";
import { isCronRequest } from "@/lib/cron/auth";

// Processes up to 10 games sequentially (Steam + scraper + occasional AI
// calls each) — generous headroom under Vercel's default budget.
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Privacy housekeeping first, so it runs even on days the re-check waits.
  const emailsPurged = await purgeReportEmails().catch(() => 0);

  // Without AI a re-check could only repeat what's stored; wait for the quota.
  if (await aiExhausted()) return Response.json({ checked: 0, emailsPurged, skipped: "ai_quota_exhausted" });

  const staleAppIds = await selectStaleGames();
  const results: { appId: number; status: string }[] = [];

  for (const appId of staleAppIds) {
    try {
      // runPipeline already invalidates the analysis:{appId} cache key itself.
      const result = await runPipeline(appId, "cron");
      results.push({ appId, status: result.status });
    } catch (err) {
      results.push({ appId, status: `error: ${err instanceof Error ? err.message : "unknown"}` });
    }
  }

  return Response.json({ checked: results.length, emailsPurged, results });
}
