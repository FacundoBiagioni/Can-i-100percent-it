import { z } from "zod";
import { db } from "@/lib/db";
import { communityReports } from "@/lib/db/schema";
import { getOrCreateGame } from "@/lib/db/queries/games";
import { overRateLimit } from "@/lib/rateLimit";

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

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }
  // Pretend success so a bot gets no signal it was caught.
  if (parsed.data.website) return Response.json({ ok: true }, { status: 201 });

  if (await overRateLimit(request, "reports", MAX_REPORTS_PER_HOUR, 60 * 60)) {
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
