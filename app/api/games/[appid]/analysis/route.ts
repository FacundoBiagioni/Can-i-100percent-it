import { getCachedAnalysis, getOrRunAnalysis, priceDlcForRegion } from "@/lib/pipeline/getOrRunAnalysis";
import { overRateLimit } from "@/lib/rateLimit";
import { getRegion } from "@/lib/pricing/server";
import { getFlaggedAchievements, getHiddenAchievementNames } from "@/lib/db/queries/achievements";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ appid: string }> },
) {
  const { appid } = await params;
  const appId = Number(appid);
  if (!Number.isInteger(appId) || appId <= 0) {
    return Response.json({ error: "invalid_appid" }, { status: 400 });
  }

  // A first-time analysis costs AI quota and several upstream calls; cap how
  // many a single connection can start, so a script walking through appids
  // can't drain them. Cached results are always served.
  if (!(await getCachedAnalysis(appId)) && (await overRateLimit(request, "analysis-new", 40, 60 * 60))) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  const outcome = await getOrRunAnalysis(appId);
  if (outcome.state === "not_found") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (outcome.state === "pending") {
    return Response.json({ status: "pending" }, { status: 202 });
  }
  const [achievements, hiddenNames, region] = await Promise.all([getFlaggedAchievements(appId), getHiddenAchievementNames(appId), getRegion()]);
  return Response.json({ analysis: await priceDlcForRegion(outcome.analysis, region.cc), achievements, hiddenNames });
}
