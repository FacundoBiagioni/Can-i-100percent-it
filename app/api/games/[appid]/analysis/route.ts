import { getOrRunAnalysis } from "@/lib/pipeline/getOrRunAnalysis";

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
  if (outcome.state === "pending") {
    return Response.json({ status: "pending" }, { status: 202 });
  }
  return Response.json({ analysis: outcome.analysis });
}
