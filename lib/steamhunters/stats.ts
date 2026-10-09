import { redis } from "@/lib/cache/redis";
import { CacheTTL } from "@/lib/cache/keys";
import { steamHuntersBulkResponseSchema } from "@/lib/validation/schemas";

/** SteamHunters' bulk endpoint rejects more than 100 ids per request. */
const MAX_IDS_PER_REQUEST = 100;

/** How many SteamHunters players took on a game, and how many finished it. */
export type AppStats = {
  appId: number;
  name: string;
  /** Hunters with at least one of its achievements. */
  started: number;
  /** Hunters with every achievement. */
  perfected: number;
  achievementCount: number;
  removed: boolean;
};

const statsKey = (appId: number) => `sh:stats:v1:${appId}`;

/**
 * Player counts for any number of games, from SteamHunters' bulk endpoint
 * (100 ids per request), cached per game for a day. Games SteamHunters
 * doesn't track are simply missing from the result. Never throws: a failed
 * batch just leaves its games out.
 */
export async function getAppStats(appIds: number[]): Promise<Map<number, AppStats>> {
  const ids = [...new Set(appIds)];
  const result = new Map<number, AppStats>();
  if (ids.length === 0) return result;

  // null = cached "not tracked", so it isn't asked again all day.
  const cached = redis ? await redis.mget<(AppStats | { untracked: true } | null)[]>(...ids.map(statsKey)) : [];
  const missing: number[] = [];
  ids.forEach((id, i) => {
    const c = cached[i];
    if (!c) missing.push(id);
    else if (!("untracked" in c)) result.set(id, c);
  });

  for (let i = 0; i < missing.length; i += MAX_IDS_PER_REQUEST) {
    const batch = missing.slice(i, i + MAX_IDS_PER_REQUEST);
    try {
      const res = await fetch(`https://steamhunters.com/api/apps?appIds=${batch.join(",")}`, {
        headers: { "User-Agent": "can-i-100-it/1.0" },
      });
      if (!res.ok) continue;
      const parsed = steamHuntersBulkResponseSchema.safeParse(await res.json());
      if (!parsed.success) continue;
      const found = new Map(parsed.data.map((a) => [a.appId, a]));
      const pipe = redis?.pipeline();
      for (const id of batch) {
        const a = found.get(id);
        if (!a) {
          pipe?.set(statsKey(id), { untracked: true }, { ex: CacheTTL.scrapeSuccess });
          continue;
        }
        const stats: AppStats = {
          appId: id,
          name: a.name ?? `AppID ${id}`,
          started: a.playersStartedCount ?? 0,
          perfected: a.playersPerfectedCount ?? 0,
          achievementCount: a.achievementCount ?? 0,
          removed: a.isRemoved ?? false,
        };
        result.set(id, stats);
        pipe?.set(statsKey(id), stats, { ex: CacheTTL.scrapeSuccess });
      }
      await pipe?.exec();
    } catch {
      // Leave this batch out; the next call tries again.
    }
  }
  return result;
}
