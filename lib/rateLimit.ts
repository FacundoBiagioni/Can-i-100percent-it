import { redis } from "@/lib/cache/redis";

/**
 * Fixed-window limit per client IP (Vercel sets x-forwarded-for). Returns true
 * once the caller is over `max` requests in the window. Skipped (never
 * limits) when Redis isn't configured, so local dev isn't blocked.
 */
export async function overRateLimit(request: Request, bucket: string, max: number, windowSeconds: number): Promise<boolean> {
  if (!redis) return false;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `ratelimit:${bucket}:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSeconds);
  return count > max;
}
