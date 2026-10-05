import { z } from "zod";
import { db } from "@/lib/db";
import { communityReports } from "@/lib/db/schema";
import { getOrCreateGame } from "@/lib/db/queries/games";
import { redis } from "@/lib/cache/redis";

const MAX_REPORTS_PER_HOUR = 5;

const bodySchema = z.object({
  gameId: z.number().int().positive(),
  achievementId: z.number().int().positive().optional(),
  reportType: z.enum(["confirmation", "dispute", "bug_report", "server_status"]),
  body: z.string().trim().min(10).max(2000),
  email: z.email().optional(),
  // Honeypot from the report form: invisible to people, filled by bots.
  website: z.string().optional(),
});

/** Fixed-window limit per client IP; skipped when Redis isn't configured. */
async function overLimit(request: Request): Promise<boolean> {
  if (!redis) return false;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `ratelimit:reports:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60 * 60);
  return count > MAX_REPORTS_PER_HOUR;
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }
  // Pretend success so a bot gets no signal it was caught.
  if (parsed.data.website) return Response.json({ ok: true }, { status: 201 });

  if (await overLimit(request)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const game = await getOrCreateGame(parsed.data.gameId);
  if (!game) {
    return Response.json({ error: "game_not_found" }, { status: 404 });
  }

  // Lands as "pending": reports only reach the pipeline once reviewed and
  // marked "accepted" (see layers/5-community/reports.ts).
  const [report] = await db
    .insert(communityReports)
    .values({
      gameId: parsed.data.gameId,
      achievementId: parsed.data.achievementId,
      reportType: parsed.data.reportType,
      body: parsed.data.body,
      submittedByEmail: parsed.data.email,
    })
    .returning({ id: communityReports.id });

  return Response.json({ ok: true, id: report.id }, { status: 201 });
}
