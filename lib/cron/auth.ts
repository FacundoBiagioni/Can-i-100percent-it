/**
 * Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"; x-cron-secret is
 * accepted for manual runs. False when no secret is configured.
 */
export function isCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const secret = bearer ?? request.headers.get("x-cron-secret");
  return Boolean(expected) && secret === expected;
}
