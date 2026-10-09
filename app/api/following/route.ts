import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { analysisResults, games } from "@/lib/db/schema";
import { getRegion } from "@/lib/pricing/server";
import { getRegionalPrices } from "@/lib/pricing/steamPrices";
import { getMaxDiscountCut } from "@/lib/pricing/itad";
import { overRateLimit } from "@/lib/rateLimit";
import { MAX_FOLLOWED } from "@/lib/following/config";

const bodySchema = z.object({
  appIds: z.array(z.number().int().positive()).min(1).max(MAX_FOLLOWED),
});

/**
 * The current state of the games a visitor follows (the list itself lives
 * in their browser): each verdict, and the discount when the game is on
 * sale at its all-time low in the visitor's Steam store, the same test the
 * game page uses. Read-only: nothing here starts an analysis.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  if (await overRateLimit(request, "following", 60, 60 * 10)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const ids = [...new Set(parsed.data.appIds)];
  const region = await getRegion();
  const [rows, prices] = await Promise.all([
    db
      .select({ appId: games.id, name: games.name, image: games.headerImageUrl, status: analysisResults.status })
      .from(games)
      .leftJoin(analysisResults, eq(analysisResults.gameId, games.id))
      .where(inArray(games.id, ids)),
    getRegionalPrices(ids, region.cc),
  ]);

  // ITAD is only asked about games on sale right now.
  const onSale = ids.filter((id) => (prices.get(id)?.discountPercent ?? 0) > 0);
  const cuts = new Map(await Promise.all(onSale.map(async (id) => [id, await getMaxDiscountCut(id, region.cc)] as const)));

  return Response.json({
    games: rows.map((r) => {
      const discount = prices.get(r.appId)?.discountPercent ?? 0;
      const record = cuts.get(r.appId);
      return {
        appId: r.appId,
        name: r.name,
        image: r.image,
        status: r.status,
        lowestCut: discount > 0 && record != null && discount >= record ? discount : null,
      };
    }),
  });
}
