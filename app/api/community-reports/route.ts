import { z } from "zod";
import { db } from "@/lib/db";
import { communityReports } from "@/lib/db/schema";
import { getOrCreateGame } from "@/lib/db/queries/games";

const bodySchema = z.object({
  gameId: z.number().int().positive(),
  achievementId: z.number().int().positive().optional(),
  reportType: z.enum(["confirmation", "dispute", "bug_report", "server_status"]),
  body: z.string().min(1).max(2000),
  email: z.email().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const game = await getOrCreateGame(parsed.data.gameId);
  if (!game) {
    return Response.json({ error: "game_not_found" }, { status: 404 });
  }

  const [report] = await db
    .insert(communityReports)
    .values({
      gameId: parsed.data.gameId,
      achievementId: parsed.data.achievementId,
      reportType: parsed.data.reportType,
      body: parsed.data.body,
      submittedByEmail: parsed.data.email,
    })
    .returning();

  return Response.json({ report }, { status: 201 });
}
