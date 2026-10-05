import { getOrFetchWithTtl } from "@/lib/cache/redis";
import { CacheTTL } from "@/lib/cache/keys";
import {
  resolveVanityResponseSchema,
  playerSummariesResponseSchema,
  ownedGamesResponseSchema,
} from "@/lib/validation/schemas";

const API = "https://api.steampowered.com";
const STEAM_ID_64 = /^7656119\d{10}$/;

export type LibraryGame = { appId: number; name: string; playtimeMinutes: number };

export type LibraryResult =
  | {
      ok: true;
      steamId: string;
      personaName: string;
      avatar: string | null;
      totalGames: number;
      /** Only games with Steam achievements — the rest have nothing to check. */
      games: LibraryGame[];
    }
  | { ok: false; error: "invalid_input" | "profile_not_found" | "private_profile" | "private_games" | "no_games" | "steam_unavailable" };

/**
 * Accepts anything a person is likely to paste: a full profile link
 * (steamcommunity.com/id/name or /profiles/7656...), a SteamID64, or a bare
 * custom URL name. Returns the SteamID64 or the vanity name to resolve.
 */
export function parseProfileInput(raw: string): { steamId: string } | { vanity: string } | null {
  const input = raw.trim().replace(/\/+$/, "");
  if (!input) return null;
  if (STEAM_ID_64.test(input)) return { steamId: input };
  const url = input.match(/steamcommunity\.com\/(profiles|id)\/([^/?#]+)/i);
  if (url) {
    if (url[1].toLowerCase() === "profiles") return STEAM_ID_64.test(url[2]) ? { steamId: url[2] } : null;
    return { vanity: decodeURIComponent(url[2]) };
  }
  if (/^[A-Za-z0-9_-]{2,32}$/.test(input)) return { vanity: input };
  return null;
}

async function steamJson(path: string): Promise<unknown | null> {
  const res = await fetch(`${API}/${path}${path.includes("?") ? "&" : "?"}key=${process.env.STEAM_API_KEY}`);
  return res.ok ? res.json() : null;
}

async function resolveSteamId(input: { steamId: string } | { vanity: string }): Promise<string | null | "unavailable"> {
  if ("steamId" in input) return input.steamId;
  const data = await steamJson(`ISteamUser/ResolveVanityURL/v1/?vanityurl=${encodeURIComponent(input.vanity)}`);
  if (!data) return "unavailable";
  const parsed = resolveVanityResponseSchema.safeParse(data);
  if (!parsed.success) return "unavailable";
  return parsed.data.response.success === 1 && parsed.data.response.steamid ? parsed.data.response.steamid : null;
}

async function fetchLibrary(steamId: string): Promise<LibraryResult> {
  const [summaryData, ownedData] = await Promise.all([
    steamJson(`ISteamUser/GetPlayerSummaries/v2/?steamids=${steamId}`),
    steamJson(`IPlayerService/GetOwnedGames/v1/?steamid=${steamId}&include_appinfo=1&include_played_free_games=1`),
  ]);
  if (!summaryData || !ownedData) return { ok: false, error: "steam_unavailable" };

  const summary = playerSummariesResponseSchema.safeParse(summaryData);
  const player = summary.success ? summary.data.response.players[0] : undefined;
  if (!player) return { ok: false, error: "profile_not_found" };

  const owned = ownedGamesResponseSchema.safeParse(ownedData);
  if (!owned.success) return { ok: false, error: "steam_unavailable" };
  const games = owned.data.response.games;
  // Steam leaves `games` out entirely when they can't be seen: either the
  // whole profile is private, or just "Game details" is.
  if (!games) return { ok: false, error: player.communityvisibilitystate === 3 ? "private_games" : "private_profile" };
  if (games.length === 0) return { ok: false, error: "no_games" };

  return {
    ok: true,
    steamId,
    personaName: player.personaname,
    avatar: player.avatarfull ?? null,
    totalGames: games.length,
    games: games
      .filter((g) => g.has_community_visible_stats)
      .map((g) => ({ appId: g.appid, name: g.name ?? `App ${g.appid}`, playtimeMinutes: g.playtime_forever })),
  };
}

export async function getLibrary(rawInput: string): Promise<LibraryResult> {
  const input = parseProfileInput(rawInput);
  if (!input) return { ok: false, error: "invalid_input" };
  const steamId = await resolveSteamId(input);
  if (steamId === "unavailable") return { ok: false, error: "steam_unavailable" };
  if (!steamId) return { ok: false, error: "profile_not_found" };
  // Short cache: someone fixing their privacy settings should see the change
  // on the next try, and failures aren't cached for long either.
  return getOrFetchWithTtl(`library:owned:${steamId}`, () => fetchLibrary(steamId), (r) => (r.ok ? 60 * 30 : CacheTTL.failureRetry));
}
