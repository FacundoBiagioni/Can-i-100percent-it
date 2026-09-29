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

  const achievements = await getFlaggedAchievements(appId);
  return Response.json({ achievements });
}
