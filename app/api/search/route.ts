import { type NextRequest } from "next/server";
import { searchGames } from "@/lib/pipeline/layers/1-steam/client";
import { getRegion } from "@/lib/pricing/server";
import { getRegionalPrices } from "@/lib/pricing/steamPrices";
import { overRateLimit } from "@/lib/rateLimit";

/** Search results, priced in the visitor's store region (one batched lookup). */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return Response.json({ results: [] });
  // Each uncached search fans out to Steam; typing sends one request per
  // pause, so this is roomy for people and tight for scripts.
  if (await overRateLimit(request, "search", 150, 10 * 60)) {
    return Response.json({ results: [], error: "rate_limited" }, { status: 429 });
  }

  const [results, region] = await Promise.all([searchGames(query), getRegion()]);
  const prices = await getRegionalPrices(
    results.filter((r) => !r.isFree).map((r) => r.appId),
    region.cc,
  );
  return Response.json({
    results: results.map((r) => ({ ...r, priceCents: r.isFree ? null : (prices.get(r.appId)?.priceCents ?? null) })),
  });
}
