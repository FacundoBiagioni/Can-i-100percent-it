import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { analysisResults } from "@/lib/db/schema";
import { redis } from "@/lib/cache/redis";
import { getAppStats } from "@/lib/steamhunters/stats";

const TOP_SELLER_PAGES = 3; // 100 games each
const POOL_KEY = "prefill:pool:v1";
const POOL_TTL = 60 * 60 * 12; // one night's runs share the same pool
const failedKey = (appId: number) => `prefill:failed:${appId}`;

/** Steam's 100 most played games right now (verified live 2026-10-09). */
async function mostPlayed(): Promise<number[]> {
  try {
    const res = await fetch("https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/");
    if (!res.ok) return [];
    const data = (await res.json()) as { response?: { ranks?: { appid: number }[] } };
    return (data.response?.ranks ?? []).map((r) => r.appid);
  } catch {
    return [];
  }
}

/**
 * Steam's top sellers, games only (category1=998). The store's search JSON
 * carries no appid field, only the capsule URL, which has it
 * (".../steam/apps/{appid}/..."); bundles and packages are skipped.
 */
async function topSellers(): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 0; page < TOP_SELLER_PAGES; page++) {
    try {
      const res = await fetch(
        `https://store.steampowered.com/search/results/?filter=topsellers&category1=998&json=1&count=100&start=${page * 100}`,
      );
      if (!res.ok) break;
      const data = (await res.json()) as { items?: { logo?: string }[] };
      for (const item of data.items ?? []) {
        const m = item.logo?.match(/\/steam\/apps\/(\d+)\//);
        if (m) ids.push(Number(m[1]));
      }
    } catch {
      break;
    }
  }
  return ids;
}

/**
 * Popular games worth analyzing ahead of time, best first. Candidates are
 * what most people look up (Steam's most played and top sellers); among
 * them, the ones the most achievement hunters have started on SteamHunters
 * come first. Games SteamHunters doesn't track, or with no achievements, are
 * left out: they'd cost quota for little.
 * Cached for the night, so later runs just skip what's done since.
 */
async function rankedPool(): Promise<number[]> {
  const cached = redis ? await redis.get<number[]>(POOL_KEY) : null;
  if (cached) return cached;

  const [played, sellers] = await Promise.all([mostPlayed(), topSellers()]);
  const candidates = [...new Set([...played, ...sellers])];
  const stats = await getAppStats(candidates);
  const pool = [...stats.values()]
    .filter((s) => s.achievementCount > 0 && !s.removed)
    .sort((a, b) => b.started - a.started)
    .map((s) => s.appId);

  if (redis && pool.length > 0) await redis.set(POOL_KEY, pool, { ex: POOL_TTL });
  return pool;
}

/** The next popular games with no verdict yet, at most `limit`. */
export async function selectPrefillGames(limit: number): Promise<number[]> {
  const pool = await rankedPool();
  if (pool.length === 0) return [];

  const done = new Set(
    (
      await db.select({ id: analysisResults.gameId }).from(analysisResults).where(inArray(analysisResults.gameId, pool))
    ).map((r) => r.id),
  );
  const todo = pool.filter((id) => !done.has(id));
  if (!redis || todo.length === 0) return todo.slice(0, limit);

  // A game whose run failed recently waits a week instead of blocking the line.
  const failed = await redis.mget<(number | null)[]>(...todo.map(failedKey));
  return todo.filter((_, i) => !failed[i]).slice(0, limit);
}

export async function markPrefillFailed(appId: number): Promise<void> {
  if (redis) await redis.set(failedKey(appId), 1, { ex: 60 * 60 * 24 * 7 });
}
