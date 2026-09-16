import { Redis } from "@upstash/redis";

const redisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

export const redis = redisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

/**
 * Check-then-fetch-then-write-through cache. TTL is in seconds.
 * Postgres stays the source of truth; this only shields slow/rate-limited
 * external calls (Steam API, scrapers) behind a short-to-medium-lived cache.
 *
 * Falls back to calling `fetchFn` directly (no caching) when Upstash isn't
 * configured yet, so local dev doesn't hard-block on that one credential.
 */
export async function getOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  if (!redis) return fetchFn();

  const cached = await redis.get<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetchFn();
  await redis.set(key, fresh, { ex: ttlSeconds });
  return fresh;
}

/** SET NX EX mutex so a game's pipeline never runs twice concurrently. */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  if (!redis) return true; // no Redis configured yet — don't block local dev on the lock
  const result = await redis.set(key, "1", { nx: true, ex: ttlSeconds });
  return result === "OK";
}

export async function releaseLock(key: string): Promise<void> {
  if (!redis) return;
  await redis.del(key);
}
