import { getOrFetchWithTtl } from "@/lib/cache/redis";
import { CacheTTL } from "@/lib/cache/keys";
import type { Locale } from "@/lib/i18n/config";

/** The site creator's Steam profile, shown on /about. */
export const CREATOR_STEAM_ID = "76561198931645825";
export const CREATOR_PROFILE_URL = `https://steamcommunity.com/profiles/${CREATOR_STEAM_ID}/`;

const API = "https://api.steampowered.com";
const ITEM_CDN = "https://shared.fastly.steamstatic.com/community_assets/images/";

export type SummaryPart = { kind: "text"; text: string } | { kind: "emoticon"; src: string; alt: string };
export type Badge = { title: string; detail: string; icon: string; href: string };
export type ShowcaseAchievement = { game: string; name: string; description: string | null; icon: string; href: string };
/** `title` is Steam's own heading, already in the requested language. */
export type Showcase =
  | { kind: "artwork"; title: string; image: string; href: string }
  | { kind: "achievements"; title: string; stats: { value: string; label: string }[]; items: ShowcaseAchievement[] }
  | { kind: "completionist"; title: string; games: { appId: number; name: string; header: string; count: string }[] };

export type CreatorProfile = {
  name: string;
  avatar: string;
  avatarFrame: string | null;
  background: string | null;
  countryCode: string | null;
  memberSince: number | null;
  status: { kind: "online" | "offline" | "in-game"; game?: string };
  level: number;
  xp: { current: number; levelStart: number; levelEnd: number } | null;
  favoriteBadge: { name: string; xp: string; icon: string } | null;
  summary: SummaryPart[];
  /** `key` is the link's path segment (badges, games, friends...), stable
   * across languages; `label` is Steam's localized text. */
  counts: { key: string; label: string; value: string }[];
  perfectGames: string | null;
  badges: Badge[];
  showcases: Showcase[];
};

async function api<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API}/${path}${path.includes("?") ? "&" : "?"}key=${process.env.STEAM_API_KEY}`).catch(() => null);
  return res?.ok ? ((await res.json().catch(() => null)) as T | null) : null;
}

function decode(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Tooltips read "Line one<br> Line two<br> Line three". */
const tooltipLines = (html: string) =>
  decode(html)
    .split(/<br\s*\/?>/i)
    .map((l) => l.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);

function parseSummary(html: string): SummaryPart[] {
  const inner = html.match(/<div class="profile_summary">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const parts: SummaryPart[] = [];
  for (const token of inner.split(/(<img[^>]*>)/)) {
    const img = token.match(/^<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/);
    if (img) parts.push({ kind: "emoticon", src: img[1], alt: img[2] });
    else {
      const text = decode(token.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")).trim();
      if (text) parts.push({ kind: "text", text });
    }
  }
  return parts;
}

function parseShowcases(html: string, names: Map<number, string>): Showcase[] {
  const end = html.indexOf("profile_recentgame_header");
  const area = end > 0 ? html.slice(0, end) : html;
  const showcases: Showcase[] = [];
  for (const block of area.split('<div class="profile_customization_header">').slice(1)) {
    // Told apart by markup, not by heading: headings come in the page's language.
    const title = decode(block.slice(0, block.indexOf("<"))).trim();
    if (block.includes('class="screenshot_showcase"')) {
      const m = block.match(/screenshot_showcase_screenshot[^>]*href="([^"]+)"[^>]*>\s*<img[^>]*src="([^"]+)"/);
      if (m) showcases.push({ kind: "artwork", title, href: decode(m[1]), image: decode(m[2]) });
    } else if (block.includes('class="achievement_showcase"')) {
      const stats = [...block.matchAll(/<div class="value">([^<]*)<\/div>\s*<div class="label">([^<]*)<\/div>/g)].map((m) => ({
        value: m[1].trim(),
        label: m[2].trim(),
      }));
      const items = [...block.matchAll(/showcase_achievement[^"]*"\s*data-tooltip-html="([^"]*)"\s*>\s*<a href="([^"]+)">\s*<img src="([^"]+)"/g)].map(
        (m) => {
          const [game = "", name = "", description = null] = tooltipLines(m[1]);
          // Unlocalized games leave the raw string id as the description.
          return { game, name, description: description && !/^NEW_ACHIEVEMENT_/.test(description) ? description : null, href: decode(m[2]), icon: m[3] };
        },
      );
      if (items.length > 0) showcases.push({ kind: "achievements", title, stats, items });
    } else if (block.includes("showcase_achievementscompletionist_games")) {
      const games = [
        ...block.matchAll(
          /steamcommunity\.com\/app\/(\d+)">\s*<img class="game_capsule" src="([^"]+)">\s*<div class="showcase_achievementscompletionist_game_num_achievements">([^<]*)<\/div>/g,
        ),
      ].map((m) => ({ appId: Number(m[1]), header: decode(m[2]), count: m[3].match(/[\d.,]+\s*\/\s*[\d.,]+/)?.[0] ?? m[3].trim(), name: names.get(Number(m[1])) ?? "" }));
      if (games.length > 0) showcases.push({ kind: "completionist", title, games });
    }
  }
  return showcases;
}

const STEAM_LANGUAGE: Record<Locale, string> = { en: "english", es: "spanish" };

async function storeNames(appIds: number[], locale: Locale): Promise<Map<number, string>> {
  if (appIds.length === 0) return new Map();
  const input = { ids: appIds.map((appid) => ({ appid })), context: { language: STEAM_LANGUAGE[locale], country_code: "US" } };
  const data = await api<{ response?: { store_items?: { appid?: number; name?: string }[] } }>(
    `IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`,
  );
  return new Map((data?.response?.store_items ?? []).filter((i) => i.appid && i.name).map((i) => [i.appid!, i.name!]));
}

type Summaries = { response: { players: { personaname: string; avatarfull: string; loccountrycode?: string; timecreated?: number; personastate: number; gameextrainfo?: string }[] } };
type BadgesRes = { response: { player_level?: number; player_xp?: number; player_xp_needed_current_level?: number; player_xp_needed_to_level_up?: number } };
type Equipped = { response: { profile_background?: { image_large?: string }; avatar_frame?: { image_large?: string; image_small?: string } } };

async function fetchProfile(locale: Locale): Promise<CreatorProfile | null> {
  const [summaries, badges, equipped, pageRes] = await Promise.all([
    api<Summaries>(`ISteamUser/GetPlayerSummaries/v2/?steamids=${CREATOR_STEAM_ID}`),
    api<BadgesRes>(`IPlayerService/GetBadges/v1/?steamid=${CREATOR_STEAM_ID}`),
    api<Equipped>(`IPlayerService/GetProfileItemsEquipped/v1/?steamid=${CREATOR_STEAM_ID}`),
    fetch(`${CREATOR_PROFILE_URL}?l=${STEAM_LANGUAGE[locale]}`, { headers: { "Accept-Language": locale } }).catch(() => null),
  ]);
  const player = summaries?.response.players[0];
  if (!player) return null;
  // The profile page holds what the API doesn't: showcases, the badge row,
  // the favorite badge and the "about me" text. Without it, the basics remain.
  const html = pageRes?.ok ? await pageRes.text() : "";

  const completionistIds = [...html.matchAll(/showcase_achievementscompletionist_game[\s\S]*?steamcommunity\.com\/app\/(\d+)/g)].map((m) => Number(m[1]));
  const names = await storeNames([...new Set(completionistIds)], locale);

  const b = badges?.response;
  const fav = html.match(/class="favorite_badge"[\s\S]*?<img src="([^"]+)"[\s\S]*?<div class="name ellipsis">([^<]*)<\/div>\s*<div class="xp">([^<]*)<\/div>/);
  const badgeStart = html.search(/\/badges\/"[^>]*>\s*<span class="count_link_label">/);
  const badgeArea = badgeStart >= 0 ? html.slice(badgeStart) : "";
  const badgeRow = badgeArea.slice(0, badgeArea.indexOf("profile_count_link_preview_ctn", 10) > 0 ? badgeArea.indexOf("profile_count_link_preview_ctn", 10) : 4000);
  const status =
    player.gameextrainfo ? { kind: "in-game" as const, game: player.gameextrainfo } : { kind: player.personastate === 0 ? ("offline" as const) : ("online" as const) };

  return {
    name: player.personaname,
    avatar: player.avatarfull,
    avatarFrame: equipped?.response.avatar_frame?.image_large ? ITEM_CDN + equipped.response.avatar_frame.image_large : null,
    background: equipped?.response.profile_background?.image_large ? ITEM_CDN + equipped.response.profile_background.image_large : null,
    countryCode: player.loccountrycode ?? null,
    memberSince: player.timecreated ?? null,
    status,
    level: b?.player_level ?? 0,
    xp:
      b?.player_xp !== undefined && b.player_xp_needed_current_level !== undefined && b.player_xp_needed_to_level_up !== undefined
        ? { current: b.player_xp, levelStart: b.player_xp_needed_current_level, levelEnd: b.player_xp + b.player_xp_needed_to_level_up }
        : null,
    favoriteBadge: fav ? { icon: fav[1], name: decode(fav[2]).trim(), xp: fav[3].trim() } : null,
    summary: parseSummary(html),
    counts: [
      ...html.matchAll(
        /href="https:\/\/steamcommunity\.com\/profiles\/\d+\/(\w+)\/?[^"]*"[^>]*>\s*<span class="count_link_label">([^<]*)<\/span>&nbsp;\s*<span class="profile_count_link_total">\s*([\d.,]+)\s*<\/span>/g,
      ),
    ].map((m) => ({ key: m[1], label: decode(m[2]).trim(), value: m[3] })),
    perfectGames: html.match(/games\/\?tab=perfect"[^>]*>\s*<div class="value">([^<]*)<\/div>/)?.[1]?.trim() ?? null,
    badges: [...badgeRow.matchAll(/profile_badges_badge\s*"\s*data-tooltip-html="([^"]*)">\s*<a href="([^"]+)">\s*<img src="([^"]+)"/g)].map((m) => {
      const [title = "", detail = ""] = tooltipLines(m[1]);
      return { title, detail, href: m[2], icon: m[3] };
    }),
    showcases: parseShowcases(html, names),
  };
}

/** Refreshed every few hours: new showcases and levels show up on their own. */
export function getCreatorProfile(locale: Locale): Promise<CreatorProfile | null> {
  return getOrFetchWithTtl(`about:creator-profile:v2:${locale}`, () => fetchProfile(locale), (p) => (p ? 60 * 60 * 6 : CacheTTL.failureRetry));
}
