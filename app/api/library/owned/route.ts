import { type NextRequest } from "next/server";
import { getLibrary } from "@/lib/steam/library";
import { overRateLimit } from "@/lib/rateLimit";

/** A Steam library's games that have achievements. ?profile= takes a profile
 * link, a SteamID64 or a custom URL name. */
export async function GET(request: NextRequest) {
  const profile = request.nextUrl.searchParams.get("profile") ?? "";
  if (await overRateLimit(request, "library-owned", 30, 60 * 60)) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const result = await getLibrary(profile);
  if (!result.ok) {
    const status = result.error === "steam_unavailable" ? 502 : result.error === "invalid_input" ? 400 : 404;
    return Response.json(result, { status });
  }
  return Response.json(result);
}
