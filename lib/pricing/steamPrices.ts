import { redis } from "@/lib/cache/redis";
import { getOrFetchWithTtl } from "@/lib/cache/redis";

export type RegionalPrice = {
  isFree: boolean;
  /** In the store's currency, in hundredths (Steam's own unit: ¥1,700 is 170000). */
  priceCents: number | null;
  /** Before any current discount; equals priceCents when not on sale. */
  initialPriceCents: number | null;
  discountPercent: number;
};

const PRICE_TTL = 60 * 60 * 24;
const MAX_IDS = 100;
const priceKey = (cc: string, appId: number) => `steam:price:v1:${cc}:${appId}`;
// Reference app to learn a store's currency (Hollow Knight: sold everywhere).
const REFERENCE_APP = 367520;

type StoreItem = {
  appid?: number;
  success?: number;
  is_free?: boolean;
  best_purchase_option?: { final_price_in_cents?: string | number; original_price_in_cents?: string | number; discount_pct?: number };
};

/**
 * Steam store prices for many apps in one country, in that store's own
 * currency, via one batched IStoreBrowseService/GetItems request per 100
 * apps (appdetails would be one request per app and trips Steam's rate
 * limit). Cached per app and country for a day. Apps Steam doesn't sell
 * there, or doesn't know, come back as null.
 */
export async function getRegionalPrices(appIds: number[], cc: string): Promise<Map<number, RegionalPrice | null>> {
  const ids = [...new Set(appIds.filter((id) => id > 0))];
  const out = new Map<number, RegionalPrice | null>();
  if (ids.length === 0) return out;

  const cached = redis ? await redis.mget<({ price: RegionalPrice | null } | null)[]>(...ids.map((id) => priceKey(cc, id))) : ids.map(() => null);
  cached.forEach((c, i) => c && out.set(ids[i], c.price));
  const missing = ids.filter((id) => !out.has(id));

  for (let i = 0; i < missing.length; i += MAX_IDS) {
    const chunk = missing.slice(i, i + MAX_IDS);
    const input = {
      ids: chunk.map((appid) => ({ appid })),
      context: { language: "english", country_code: cc },
      data_request: { include_all_purchase_options: true },
    };
    const res = await fetch(
      `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`,
    ).catch(() => null);
    if (!res?.ok) continue; // leave them unpriced this time, uncached
    const data = (await res.json().catch(() => null)) as { response?: { store_items?: StoreItem[] } } | null;
    const items = data?.response?.store_items ?? [];
    const fresh: [number, RegionalPrice | null][] = chunk.map((appId, idx) => {
      // Items come back in request order; unknown apps carry appid 0.
      const item = items[idx];
      if (!item || item.success !== 1) return [appId, null];
      if (item.is_free) return [appId, { isFree: true, priceCents: null, initialPriceCents: null, discountPercent: 0 }];
      const best = item.best_purchase_option;
      if (!best || best.final_price_in_cents === undefined) return [appId, null];
      const final = Number(best.final_price_in_cents);
      const original = best.original_price_in_cents !== undefined ? Number(best.original_price_in_cents) : final;
      return [appId, { isFree: false, priceCents: final, initialPriceCents: original, discountPercent: best.discount_pct ?? 0 }];
    });
    for (const [id, price] of fresh) out.set(id, price);
    if (redis && fresh.length > 0) {
      const pipe = redis.pipeline();
      for (const [id, price] of fresh) pipe.set(priceKey(cc, id), { price }, { ex: PRICE_TTL });
      await pipe.exec();
    }
  }
  return out;
}

export async function getRegionalPrice(appId: number, cc: string): Promise<RegionalPrice | null> {
  return (await getRegionalPrices([appId], cc)).get(appId) ?? null;
}

/** The currency a country's Steam store charges in (Argentina and Turkey
 * use USD, Brazil BRL, the euro area EUR...), read off a reference game's
 * price there. Cached for a week. */
export async function getRegionCurrency(cc: string): Promise<string> {
  const currency = await getOrFetchWithTtl(
    `steam:currency:v1:${cc}`,
    async () => {
      const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${REFERENCE_APP}&cc=${cc}&filters=price_overview`).catch(
        () => null,
      );
      const data = res?.ok ? ((await res.json().catch(() => null)) as Record<string, { data?: { price_overview?: { currency?: string } } }> | null) : null;
      return data?.[String(REFERENCE_APP)]?.data?.price_overview?.currency ?? null;
    },
    (c) => (c ? 60 * 60 * 24 * 7 : 60 * 10),
  );
  return currency ?? "USD";
}
