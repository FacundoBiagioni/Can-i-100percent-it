import { z } from "zod";
import { mapRequiredDlc } from "@/lib/library/dlcMapping";
import { getDlcOwnershipForGame } from "@/lib/library/status";
import { overRateLimit } from "@/lib/rateLimit";

const bodySchema = z.object({
  appId: z.number().int().positive(),
  steamId: z.string().regex(/^7656119\d{10}$/),
});

/** Maps which DLC one game needs for 100% (once, saved for good), then says
 * which of them this player owns. The library calls it for paid-DLC games
 * that were never analyzed, one at a time. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
  // Roomy enough for a big library's paid-DLC games on a first check.
  if (await overRateLimit(request, "library-dlc", 300, 60 * 60)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  const { appId, steamId } = parsed.data;
  const outcome = await mapRequiredDlc(appId);
  const dlc = outcome === "mapped" || outcome === "already_known" ? await getDlcOwnershipForGame(steamId, appId) : null;
  return Response.json({ outcome, dlc });
}
