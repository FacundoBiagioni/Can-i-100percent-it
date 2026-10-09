import { timingSafeEqual } from "node:crypto";

/**
 * The admin panel lives at /admin/<ADMIN_SECRET>: whoever has the link gets
 * in. Off (always false) until a long enough secret is configured.
 */
export function isAdminKey(key: unknown): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 24 || typeof key !== "string") return false;
  const a = Buffer.from(key);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
