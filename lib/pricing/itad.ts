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
 * The biggest discount % Steam has ever run on this game in one country's
 * store. Only the percentage is used, applied by the caller to that store's
 * current regular price: ITAD's own price figures are sometimes in another
 * currency than Steam uses today (it still reports Turkey in TRY), while a
 * cut is the same whatever the currency.
 *
 * Requires ITAD_API_KEY (a free developer key from isthereanydeal.com/apps/my)
 * and returns null without it, like every other optional data source.
 */
export async function getMaxDiscountCut(appId: number, cc: string): Promise<number | null> {
  const apiKey = process.env.ITAD_API_KEY;
  if (!apiKey) return null;

  const itadId = await lookupItadId(appId, apiKey);
  if (!itadId) return null;

  return getOrFetch(CacheKeys.itadDeal(appId, cc), CacheTTL.itadDeal, async () => {
    const res = await fetch(`${ITAD_BASE}/games/storelow/v2?key=${apiKey}&country=${cc}&shops=${STEAM_SHOP_ID}`, {
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
