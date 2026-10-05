import { redis } from "@/lib/cache/redis";
import { CacheTTL } from "@/lib/cache/keys";
import { getRequiredDlcByGame } from "@/lib/db/queries/analysis";
import {
  steamHuntersBulkResponseSchema,
  storeAssetsResponseSchema,
  topAchievementsResponseSchema,
} from "@/lib/validation/schemas";

/** SteamHunters' bulk endpoint rejects more than 100 ids per request. */
export const MAX_IDS_PER_REQUEST = 100;
const ASSET_CDN = "https://shared.akamai.steamstatic.com/store_item_assets/";

export type AppStatus = { appId: number; tracked: boolean; unobtainable: number; hasPaidDlc: boolean };
export type Progress = { unlocked: number; total: number };
/** Required DLC the player owns, judged by whether they've unlocked any
 * achievement that DLC gates. Only known for games already analyzed here. */
export type DlcOwnership = { required: number; owned: number };
export type FlaggedGame = AppStatus & {
  capsule: string | null;
  header: string | null;
  progress: Progress | null;
  dlc: DlcOwnership | null;
};

const statusKey = (appId: number) => `library:sh:${appId}`;
const assetsKey = (appId: number) => `library:assets:${appId}`;

/**
 * The two facts the library view filters on — unobtainable achievements and
 * paid DLC needed for 100% — straight from SteamHunters' curated data, for up
 * to 100 games in ONE request and with no AI involved, so an 800-game library
 * costs 8 requests and zero Gemini quota. Same source the game page's verdict
 * uses, so a card and the page it links to agree. Cached per game for a day.
 */
export async function getAppStatuses(appIds: number[]): Promise<AppStatus[] | null> {
  const ids = [...new Set(appIds)].slice(0, MAX_IDS_PER_REQUEST);
  if (ids.length === 0) return [];

  const cached = redis ? await redis.mget<(AppStatus | null)[]>(...ids.map(statusKey)) : ids.map(() => null);
  const result = new Map<number, AppStatus>();
  cached.forEach((c, i) => c && result.set(ids[i], c));
  const missing = ids.filter((id) => !result.has(id));

  if (missing.length > 0) {
    const res = await fetch(`https://steamhunters.com/api/apps?appIds=${missing.join(",")}`, {
      headers: { "User-Agent": "can-i-100-it/1.0" },
    });
    if (!res.ok) return null;
    const parsed = steamHuntersBulkResponseSchema.safeParse(await res.json());
    if (!parsed.success) return null;
    const found = new Map(parsed.data.map((a) => [a.appId, a]));
    for (const id of missing) {
      const a = found.get(id);
      // Not in the response = SteamHunters doesn't track it.
      const status: AppStatus = a
        ? { appId: id, tracked: true, unobtainable: a.unobtainableAchievementCount, hasPaidDlc: a.hasPaidDlc }
        : { appId: id, tracked: false, unobtainable: 0, hasPaidDlc: false };
      result.set(id, status);
    }
    if (redis) {
      const pipe = redis.pipeline();
      for (const id of missing) pipe.set(statusKey(id), result.get(id)!, { ex: CacheTTL.scrapeSuccess });
      await pipe.exec();
    }
  }
  return ids.map((id) => result.get(id)!);
}

type Assets = { capsule: string | null; header: string | null };

/** Library capsule (600x900) and header art for each game, via one batched
 * store lookup. Paths include a per-game hash on newer assets, so they're
 * read from Steam rather than guessed. */
async function getAssets(appIds: number[]): Promise<Map<number, Assets>> {
  const out = new Map<number, Assets>();
  if (appIds.length === 0) return out;
  const cached = redis ? await redis.mget<(Assets | null)[]>(...appIds.map(assetsKey)) : appIds.map(() => null);
  cached.forEach((c, i) => c && out.set(appIds[i], c));
  const missing = appIds.filter((id) => !out.has(id));
  if (missing.length === 0) return out;

  const input = {
    ids: missing.map((appid) => ({ appid })),
    context: { language: "english", country_code: "US" },
    data_request: { include_assets: true },
  };
  const res = await fetch(`https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`);
  const parsed = res.ok ? storeAssetsResponseSchema.safeParse(await res.json()) : null;
  const items = parsed?.success ? parsed.data.response.store_items : [];
  items.forEach((item, i) => {
    const appId = item.appid ?? missing[i];
    const format = item.assets?.asset_url_format;
    const url = (file?: string) => (format && file ? ASSET_CDN + format.replace("${FILENAME}", file) : null);
    out.set(appId, { capsule: url(item.assets?.library_capsule), header: url(item.assets?.header) });
  });
  const toCache = missing.filter((id) => out.has(id));
  // Upstash throws on an empty pipeline, so only write when there's something.
  if (redis && toCache.length > 0) {
    const pipe = redis.pipeline();
    for (const id of toCache) pipe.set(assetsKey(id), out.get(id)!, { ex: 60 * 60 * 24 * 7 });
    await pipe.exec();
  }
  return out;
}

type PlayerProgress = Progress & { unlockedNames: Set<string> };

const normalize = (name: string) => name.trim().toLowerCase();

/** The player's unlocked achievements for up to 100 games in one request.
 * Null when Steam fails or hides them; the cards then just skip progress. */
async function getPlayerProgress(steamId: string, appIds: number[]): Promise<Map<number, PlayerProgress> | null> {
  if (appIds.length === 0) return new Map();
  const ids = appIds.map((id, i) => `appids%5B${i}%5D=${id}`).join("&");
  const res = await fetch(
    `https://api.steampowered.com/IPlayerService/GetTopAchievementsForGames/v1/?key=${process.env.STEAM_API_KEY}&steamid=${steamId}&language=english&max_achievements=10000&${ids}`,
  ).catch(() => null);
  if (!res?.ok) return null;
  const parsed = topAchievementsResponseSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) return null;
  return new Map(
    parsed.data.response.games.map((g) => [
      g.appid,
      { unlocked: g.achievements.length, total: g.total_achievements, unlockedNames: new Set(g.achievements.map((a) => normalize(a.name))) },
    ]),
  );
}

async function getDlcOwnership(
  appIds: number[],
  progress: Map<number, PlayerProgress> | null,
): Promise<Map<number, DlcOwnership>> {
  const out = new Map<number, DlcOwnership>();
  if (!progress || appIds.length === 0) return out;
  // The library still works without the database; ownership just stays unknown.
  const requiredByGame = await getRequiredDlcByGame(appIds).catch(() => new Map<number, never[]>());
  for (const [appId, required] of requiredByGame) {
    const p = progress.get(appId);
    if (!p) continue;
    const complete = p.total > 0 && p.unlocked >= p.total;
    const owned = required.filter((d) => complete || (d.evidence ?? []).some((name) => p.unlockedNames.has(normalize(name)))).length;
    out.set(appId, { required: required.length, owned });
  }
  return out;
}

/** Statuses for a batch, plus art and the player's progress for the games
 * worth showing: the ones with a catch, and the ones already at 100%. */
export async function getFlaggedGames(
  appIds: number[],
  steamId: string | null,
): Promise<{ checked: number; untracked: number; flagged: FlaggedGame[] } | null> {
  const statuses = await getAppStatuses(appIds);
  if (!statuses) return null;
  // Progress for the whole batch (still one request), so perfected games
  // without any catch can be shown too.
  const progress = steamId ? await getPlayerProgress(steamId, statuses.map((s) => s.appId)) : null;
  const perfect = (appId: number) => {
    const p = progress?.get(appId);
    return Boolean(p && p.total > 0 && p.unlocked >= p.total);
  };
  const shown = statuses.filter((s) => s.unobtainable > 0 || s.hasPaidDlc || perfect(s.appId));
  const [assets, dlc] = await Promise.all([
    getAssets(shown.map((s) => s.appId)),
    getDlcOwnership(
      shown.filter((s) => s.hasPaidDlc).map((s) => s.appId),
      progress,
    ),
  ]);
  return {
    checked: statuses.length,
    untracked: statuses.filter((s) => !s.tracked).length,
    flagged: shown.map((s) => {
      const p = progress?.get(s.appId);
      return {
        ...s,
        capsule: assets.get(s.appId)?.capsule ?? null,
        header: assets.get(s.appId)?.header ?? null,
        progress: p && p.total > 0 ? { unlocked: p.unlocked, total: p.total } : null,
        dlc: dlc.get(s.appId) ?? null,
      };
    }),
  };
}

/** One game's DLC ownership for a player, e.g. right after mapping its DLC. */
export async function getDlcOwnershipForGame(steamId: string, appId: number): Promise<DlcOwnership | null> {
  const progress = await getPlayerProgress(steamId, [appId]);
  return (await getDlcOwnership([appId], progress)).get(appId) ?? null;
}
