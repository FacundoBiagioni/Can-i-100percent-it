import { z } from "zod";
import { getOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";

const ITAD_BASE = "https://api.isthereanydeal.com";
// Verified live against /service/shops/v1 on 2026-09-30: {"id":61,"title":"Steam",...}
const STEAM_SHOP_ID = 61;

const lookupResponseSchema = z.object({
  found: z.boolean(),
  game: z.object({ id: z.string() }).optional(),
});

const priceSchema = z.object({
  amountInt: z.number(),
  currency: z.string(),
});

const pricesResponseSchema = z.array(
  z.object({
    id: z.string(),
    deals: z.array(
      z.object({
        shop: z.object({ id: z.number() }),
        price: priceSchema,
        cut: z.number(),
      }),
    ),
  }),
);

const storeLowResponseSchema = z.array(
  z.object({
    id: z.string(),
    lows: z.array(
      z.object({
        shop: z.object({ id: z.number() }),
        price: priceSchema,
        cut: z.number(),
      }),
    ),
  }),
);

export type ArgentinaDeal = {
  /** Current Steam AR price, in real ARS (not the USD-denominated figure
   * Steam's own storefront API gives to a non-AR-based caller). */
  current: { priceCents: number; currency: string; cut: number } | null;
  /** The lowest Steam AR price has ever gone, and the discount % that was
   * actually applied at the time (against that sale's own regular price,
   * not today's — Argentina's regional price rises with local inflation,
   * so this is not the same as computing a % off today's price). */
  historicalLow: { priceCents: number; currency: string; cut: number } | null;
};

/** Steam AppID -> ITAD's own internal game UUID. Essentially permanent once
 * a game is catalogued, so cached long-lived. */
async function lookupItadId(appId: number, apiKey: string): Promise<string | null> {
  return getOrFetch(CacheKeys.itadLookup(appId), CacheTTL.itadLookup, async () => {
    const res = await fetch(`${ITAD_BASE}/games/lookup/v1?key=${apiKey}&appid=${appId}`);
    if (!res.ok) return null;
    const parsed = lookupResponseSchema.safeParse(await res.json());
    if (!parsed.success || !parsed.data.found || !parsed.data.game) return null;
    return parsed.data.game.id;
  });
}

/**
 * Requires ITAD_API_KEY (a free developer key from isthereanydeal.com/apps/my)
 * — returns null immediately if it's not configured, same degrade-gracefully
 * pattern as every other optional data source in this pipeline.
 */
export async function getArgentinaDeal(appId: number): Promise<ArgentinaDeal | null> {
  const apiKey = process.env.ITAD_API_KEY;
  if (!apiKey) return null;

  const itadId = await lookupItadId(appId, apiKey);
  if (!itadId) return null;

  return getOrFetch(CacheKeys.itadDeal(appId), CacheTTL.itadDeal, async () => {
    const [pricesRes, lowRes] = await Promise.all([
      fetch(`${ITAD_BASE}/games/prices/v3?key=${apiKey}&country=AR&shops=${STEAM_SHOP_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([itadId]),
      }),
      fetch(`${ITAD_BASE}/games/storelow/v2?key=${apiKey}&country=AR&shops=${STEAM_SHOP_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([itadId]),
      }),
    ]);

    let current: ArgentinaDeal["current"] = null;
    if (pricesRes.ok) {
      const parsed = pricesResponseSchema.safeParse(await pricesRes.json());
      const deal = parsed.success ? parsed.data[0]?.deals.find((d) => d.shop.id === STEAM_SHOP_ID) : undefined;
      if (deal) current = { priceCents: deal.price.amountInt, currency: deal.price.currency, cut: deal.cut };
    }

    let historicalLow: ArgentinaDeal["historicalLow"] = null;
    if (lowRes.ok) {
      const parsed = storeLowResponseSchema.safeParse(await lowRes.json());
      const low = parsed.success ? parsed.data[0]?.lows.find((l) => l.shop.id === STEAM_SHOP_ID) : undefined;
      if (low) historicalLow = { priceCents: low.price.amountInt, currency: low.price.currency, cut: low.cut };
    }

    return { current, historicalLow };
  });
}
