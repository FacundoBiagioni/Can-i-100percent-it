import { getOrRunAnalysis, priceDlcForRegion } from "@/lib/pipeline/getOrRunAnalysis";
import { getRegion } from "@/lib/pricing/server";
import { getFlaggedAchievements } from "@/lib/db/queries/achievements";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ appid: string }> },
) {
  const { appid } = await params;
  const appId = Number(appid);
  if (!Number.isInteger(appId) || appId <= 0) {
    return Response.json({ error: "invalid_appid" }, { status: 400 });
  }

  const outcome = await getOrRunAnalysis(appId);
  if (outcome.state === "not_found") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (outcome.state === "pending") {
    return Response.json({ status: "pending" }, { status: 202 });
  }
  const [achievements, region] = await Promise.all([getFlaggedAchievements(appId), getRegion()]);
  return Response.json({ analysis: await priceDlcForRegion(outcome.analysis, region.cc), achievements });
}
