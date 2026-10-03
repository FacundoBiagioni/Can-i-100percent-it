import { getOrFetchWithTtl } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { storeItemsResponseSchema } from "@/lib/validation/schemas";

const GET_ITEMS_URL = "https://api.steampowered.com/IStoreBrowseService/GetItems/v1/";
const BATCH_SIZE = 100;
const TYPE_DLC = 4;

export type DlcCatalogEntry = {
  appId: number;
  /** false when Steam's store no longer knows this app at all (removed). */
  exists: boolean;
  name: string;
  /** Store short description — what the DLC actually adds. */
  description: string;
  isFree: boolean;
  /** Can still be obtained: sold on its own or in a bundle, or free. */
  purchasable: boolean;
};

async function fetchBatch(appIds: number[]): Promise<DlcCatalogEntry[] | null> {
  const input = {
    ids: appIds.map((appid) => ({ appid })),
    context: { language: "english", country_code: "US" },
    data_request: { include_basic_info: true, include_all_purchase_options: true },
  };
  const res = await fetch(`${GET_ITEMS_URL}?input_json=${encodeURIComponent(JSON.stringify(input))}`);
  if (!res.ok) return null;
  const parsed = storeItemsResponseSchema.safeParse(await res.json());
  if (!parsed.success) return null;

  const entries: DlcCatalogEntry[] = [];
  // Items come back in request order; a not-found item has no appid of its
  // own, so its position is what identifies it.
  parsed.data.response.store_items.forEach((item, i) => {
    const appId = item.appid ?? appIds[i];
    if (item.success !== 1) {
      entries.push({ appId, exists: false, name: `Unknown DLC (${appId})`, description: "", isFree: false, purchasable: false });
      return;
    }
    // Soundtracks (type 11) and the odd non-DLC app Steam lists among a
    // game's DLC (e.g. a re-release's own appid) never gate achievements.
    if (item.type !== TYPE_DLC) return;
    const isFree = item.is_free === true;
    entries.push({
      appId,
      exists: true,
      name: item.name ?? `DLC ${appId}`,
      description: item.basic_info?.short_description ?? "",
      isFree,
      purchasable: isFree || Boolean(item.best_purchase_option) || (item.purchase_options?.length ?? 0) > 0,
    });
  });
  return entries;
}

/**
 * Every DLC of a game, in one or a few batched store requests. Returns null
 * when Steam couldn't be reached, which callers must treat as "unknown" —
 * never as "this DLC was delisted". Steam's own DLC list sometimes repeats
 * an appid (Dying Light lists The Following twice), so ids are deduped.
 */
export async function getDlcCatalog(gameAppId: number, dlcAppIds: number[]): Promise<DlcCatalogEntry[] | null> {
  const ids = [...new Set(dlcAppIds)];
  if (ids.length === 0) return [];
  return getOrFetchWithTtl(
    CacheKeys.steamDlcCatalog(gameAppId),
    async () => {
      const all: DlcCatalogEntry[] = [];
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = await fetchBatch(ids.slice(i, i + BATCH_SIZE));
        if (!batch) return null;
        all.push(...batch);
      }
      return all;
    },
    (result) => (result ? CacheTTL.steamDlcCatalog : CacheTTL.failureRetry),
  );
}
