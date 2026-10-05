import { z } from "zod";
import { getFlaggedGames, MAX_IDS_PER_REQUEST } from "@/lib/library/status";
import { overRateLimit } from "@/lib/rateLimit";

const bodySchema = z.object({
  appIds: z.array(z.number().int().positive()).min(1).max(MAX_IDS_PER_REQUEST),
});

/** For one batch of up to 100 games: which have unobtainable achievements
 * or need paid DLC for 100%, with their library art. No AI involved. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  // ~10 batches covers a 1,000-game library; leave room for a few re-checks.
  if (await overRateLimit(request, "library-status", 120, 60 * 60)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  const result = await getFlaggedGames(parsed.data.appIds);
  if (!result) return Response.json({ error: "steamhunters_unavailable" }, { status: 502 });
  return Response.json(result);
}
