import { getOrCreateGame } from "@/lib/db/queries/games";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ appid: string }> },
) {
  const { appid } = await params;
  const appId = Number(appid);
  if (!Number.isInteger(appId) || appId <= 0) {
    return Response.json({ error: "invalid_appid" }, { status: 400 });
  }

  const game = await getOrCreateGame(appId);
  if (!game) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({ game });
}
