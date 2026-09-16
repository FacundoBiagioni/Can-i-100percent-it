import { type NextRequest } from "next/server";
import { searchGames } from "@/lib/pipeline/layers/1-steam/client";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return Response.json({ results: [] });

  const results = await searchGames(query);
  return Response.json({ results });
}
