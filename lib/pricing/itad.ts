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

const storeLowResponseSchema = z.array(
  z.object({
    id: z.string(),
    lows: z.array(
      z.object({
        shop: z.object({ id: z.number() }),
        cut: z.number(),
      }),
    ),
  }),
);

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
 * The biggest discount % Steam has ever run on this game in Argentina —
 * only the percentage, not ITAD's own price figure, since ITAD's regional
 * data is denominated in real ARS while the rest of this app shows Steam's
 * own USD-denominated AR price (per request — "como aparece en Steam,
 * pero en dólares"). The caller applies this % to the current USD regular
 * price (getArgentinaPricing's initialPriceCents) instead, since cut is a
 * dimensionless percentage that carries over regardless of currency.
 *
 * Requires ITAD_API_KEY (a free developer key from isthereanydeal.com/apps/my)
 * — returns null immediately if it's not configured, same degrade-gracefully
 * pattern as every other optional data source in this pipeline.
 */
export async function getArgentinaMaxDiscountCut(appId: number): Promise<number | null> {
  const apiKey = process.env.ITAD_API_KEY;
  if (!apiKey) return null;

  const itadId = await lookupItadId(appId, apiKey);
  if (!itadId) return null;

  return getOrFetch(CacheKeys.itadDeal(appId), CacheTTL.itadDeal, async () => {
    const res = await fetch(`${ITAD_BASE}/games/storelow/v2?key=${apiKey}&country=AR&shops=${STEAM_SHOP_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([itadId]),
    });
    if (!res.ok) return null;
    const parsed = storeLowResponseSchema.safeParse(await res.json());
    if (!parsed.success) return null;
    const low = parsed.data[0]?.lows.find((l) => l.shop.id === STEAM_SHOP_ID);
    return low?.cut ?? null;
  });
}
