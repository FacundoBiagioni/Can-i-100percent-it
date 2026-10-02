import { getOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { STEAM_ENDPOINTS, MULTIPLAYER_CATEGORY_MARKERS } from "@/lib/steam/constants";
import {
  storeSearchResponseSchema,
  appDetailsResponseSchema,
  schemaForGameResponseSchema,
  globalAchievementPercentagesResponseSchema,
  currentPlayersResponseSchema,
} from "@/lib/validation/schemas";
import type { Analyzer, AnalyzerContext, Facts, EvidenceClaim, DlcRequirement } from "../../types";

export type SteamGameSummary = {
  appId: number;
  name: string;
  image?: string;
  isFree: boolean;
  priceCents: number | null;
};

export async function searchGames(query: string): Promise<SteamGameSummary[]> {
  return getOrFetch(CacheKeys.steamSearch(query), CacheTTL.steamSearch, async () => {
    const url = `${STEAM_ENDPOINTS.storeSearch}?term=${encodeURIComponent(query)}&l=english&cc=US`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const parsed = storeSearchResponseSchema.safeParse(await res.json());
    if (!parsed.success) return [];
    const candidates = parsed.data.items.filter((item) => item.type === "app");

    // storesearch's own `type` field is always "app" for every result —
    // verified live it doesn't distinguish a game from its DLC or
    // soundtrack (Graveyard Keeper's "Stranger Sins" DLC and Hollow
    // Knight's "Official Soundtrack" both report type "app" there). Real
    // classification ("game", "dlc", "music", ...) only comes from
    // appdetails — reusing the full getAppDetails call (already cached
    // 24h) instead of a separate lighter one. Price comes from the
    // Argentina storefront like every other price shown in the app.
    // Games always kept. Non-game software (Steam's own "application"
    // type, e.g. Wallpaper Engine) only kept if it actually has
    // achievements — otherwise there's nothing for this app to do with
    // it. Everything else (dlc, music, demo, video, ...) is dropped.
    const classified = await Promise.all(
      candidates.map(async (item) => {
        const details = await getAppDetails(item.id);
        if (!details) return null;
        const keep =
          details.type === "game" ||
          (details.type === "application" && (await getAchievementSchema(item.id)).length > 0);
        if (!keep) return null;
        const pricing = await getArgentinaPricing(item.id);
        return { item, details, pricing };
      }),
    );

    return classified
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .map(({ item, details, pricing }) => ({
        appId: item.id,
        name: item.name,
        image: item.tiny_image,
        isFree: details.isFree,
        priceCents: pricing?.priceCents ?? null,
      }));
  });
}

export type SteamAppDetails = {
  appId: number;
  name: string;
  /** Steam's own classification — "game", "dlc", "music", "application", ... */
  type: string;
  headerImage?: string;
  /** A real gameplay screenshot when one exists — far more vivid than
   * background_raw, which Steam intentionally fades for use behind store
   * page text and looks washed-out blown up to a full-bleed hero. Falls
   * back to background_raw only for the rare app with no screenshots. */
  heroImage?: string;
  dlcAppIds: number[];
  multiplayerRequired: boolean;
  releaseDate?: string;
  isFree: boolean;
};

/** Region-neutral metadata only (fetched as cc=us so region-locked titles
 * still resolve). Prices deliberately aren't exposed here: every price in
 * the app comes from getArgentinaPricing, so US and AR figures never mix. */
export async function getAppDetails(appId: number): Promise<SteamAppDetails | null> {
  return getOrFetch(CacheKeys.steamAppDetails(appId), CacheTTL.steamAppDetails, async () => {
    const url = `${STEAM_ENDPOINTS.appDetails}?appids=${appId}&cc=us&l=english`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const parsed = appDetailsResponseSchema(appId).safeParse(await res.json());
    if (!parsed.success) return null;
    const entry = parsed.data[String(appId)];
    if (!entry.success || !entry.data) return null;

    const categories = entry.data.categories.map((c) => c.description);
    return {
      appId,
      name: entry.data.name,
      type: entry.data.type,
      headerImage: entry.data.header_image,
      heroImage: entry.data.screenshots[0]?.path_full ?? entry.data.background_raw,
      dlcAppIds: entry.data.dlc,
      multiplayerRequired: categories.some((c) => MULTIPLAYER_CATEGORY_MARKERS.includes(c)),
      releaseDate: entry.data.release_date?.date,
      isFree: entry.data.is_free ?? false,
    };
  });
}

export type ArPricing = {
  isFree: boolean;
  currency: string;
  priceCents: number | null;
  /** Pre-discount regular price — needed to apply a discount % (e.g. an
   * ITAD historical-low cut) against a USD-denominated figure, and to show
   * a struck-through "was" price when the game is currently on sale. */
  initialPriceCents: number | null;
  /** Steam's own current discount %, 0 when not on sale. */
  discountPercent: number;
};

/**
 * Argentina's Steam storefront pricing — verified live to be genuinely
 * discounted vs. the US price (Hollow Knight: $4.99 at cc=ar vs $14.99 at
 * cc=us), even though Valve denominates it in USD rather than ARS for this
 * region. A separate call/cache key from getAppDetails since it's a
 * different `cc` on the same endpoint.
 */
export async function getArgentinaPricing(appId: number): Promise<ArPricing | null> {
  return getOrFetch(CacheKeys.steamArPricing(appId), CacheTTL.steamArPricing, async () => {
    const url = `${STEAM_ENDPOINTS.appDetails}?appids=${appId}&cc=ar&l=english`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const parsed = appDetailsResponseSchema(appId).safeParse(await res.json());
    if (!parsed.success) return null;
    const entry = parsed.data[String(appId)];
    if (!entry.success || !entry.data) return null;

    if (entry.data.is_free) {
      return { isFree: true, currency: "", priceCents: null, initialPriceCents: null, discountPercent: 0 };
    }
    if (!entry.data.price_overview) return null;
    return {
      isFree: false,
      currency: entry.data.price_overview.currency,
      priceCents: entry.data.price_overview.final,
      initialPriceCents: entry.data.price_overview.initial,
      discountPercent: entry.data.price_overview.discount_percent,
    };
  });
}

export type DlcDetails = { appId: number; name: string; priceCents: number | null; isFree: boolean; type: string };

export async function getDlcDetails(dlcAppId: number): Promise<DlcDetails> {
  const [details, pricing] = await Promise.all([getAppDetails(dlcAppId), getArgentinaPricing(dlcAppId)]);
  if (!details) {
    // DLC page pulled/delisted — appdetails returns success:false for it.
    return { appId: dlcAppId, name: `Unknown DLC (${dlcAppId})`, priceCents: null, isFree: false, type: "dlc" };
  }
  return {
    appId: dlcAppId,
    name: details.name,
    priceCents: pricing?.priceCents ?? null,
    isFree: details.isFree,
    type: details.type,
  };
}

export type SteamAchievementSchema = {
  name: string;
  displayName: string;
  hidden: boolean;
  description?: string;
  icon?: string;
};

export async function getAchievementSchema(appId: number): Promise<SteamAchievementSchema[]> {
  return getOrFetch(CacheKeys.steamSchema(appId), CacheTTL.steamSchema, async () => {
    const url = `${STEAM_ENDPOINTS.schemaForGame}?key=${process.env.STEAM_API_KEY}&appid=${appId}&l=english`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const parsed = schemaForGameResponseSchema.safeParse(await res.json());
    if (!parsed.success) return [];
    const achievements = parsed.data.game.availableGameStats?.achievements ?? [];
    return achievements.map((a) => ({
      name: a.name,
      displayName: a.displayName || a.name,
      hidden: a.hidden === 1,
      description: a.description,
      icon: a.icon,
    }));
  });
}

export async function getGlobalAchievementPercentages(
  appId: number,
): Promise<Record<string, number>> {
  return getOrFetch(CacheKeys.steamGlobalPct(appId), CacheTTL.steamGlobalPct, async () => {
    const url = `${STEAM_ENDPOINTS.globalAchievementPercentages}?gameid=${appId}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const parsed = globalAchievementPercentagesResponseSchema.safeParse(await res.json());
    if (!parsed.success) return {};
    return Object.fromEntries(
      parsed.data.achievementpercentages.achievements.map((a) => [a.name, a.percent]),
    );
  });
}

export async function getCurrentPlayers(appId: number): Promise<number | null> {
  return getOrFetch(CacheKeys.steamCurrentPlayers(appId), CacheTTL.steamCurrentPlayers, async () => {
    const url = `${STEAM_ENDPOINTS.currentPlayers}?appid=${appId}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const parsed = currentPlayersResponseSchema.safeParse(await res.json());
    if (!parsed.success || parsed.data.response.result !== 1) return null;
    return parsed.data.response.player_count ?? null;
  });
}

/**
 * Layer 1 — always runs first, non-optional. If the game isn't found on
 * Steam at all, the orchestrator short-circuits before reaching this
 * analyzer's caller, so `run` assumes the AppID is valid.
 */
export const steamAnalyzer: Analyzer = {
  id: "steam_api",
  async run(ctx: AnalyzerContext): Promise<Partial<Facts> & { claims: EvidenceClaim[] }> {
    const checkedAt = new Date();
    const claims: EvidenceClaim[] = [];

    const [details, globalPct, currentPlayers] = await Promise.all([
      getAppDetails(ctx.appId),
      getGlobalAchievementPercentages(ctx.appId),
      getCurrentPlayers(ctx.appId),
    ]);

    if (!details) {
      claims.push({
        sourceKey: "steam_api",
        claim: { error: "not_found_on_steam" },
        confidence: "high",
        checkedAt,
      });
      return { foundOnSteam: false, claims };
    }

    const dlcDetails = await Promise.all(details.dlcAppIds.map(getDlcDetails));
    // Soundtracks/other non-gameplay "dlc" entries (type "music") never
    // gate achievements — excluded entirely so a scraper/AI claim naming a
    // real expansion can't get fuzzy-matched onto its same-named soundtrack
    // instead (confirmed live: The Witcher 3's remastered SKU only lists
    // "Hearts of Stone Soundtrack"/"Blood and Wine Soundtrack" as owned DLC,
    // not the expansions themselves, which wrongly matched "Hearts of
    // Stone" from a Wikipedia-derived claim onto the soundtrack).
    const dlcNeeded: DlcRequirement[] = dlcDetails
      .filter((d) => d.type !== "music")
      .map((d) => ({
        dlcAppId: d.appId,
        name: d.name,
        priceCents: d.priceCents,
        required: false, // layer 3 decides "required" from achievement->DLC links + scraper evidence
        isDelisted: d.name.startsWith("Unknown DLC"),
      }));

    claims.push({
      sourceKey: "steam_api",
      claim: { type: "app_details", multiplayerRequired: details.multiplayerRequired, dlcCount: dlcNeeded.length },
      confidence: "high",
      reasoning: "Steam Storefront appdetails categories + dlc list",
      checkedAt,
    });

    if (currentPlayers !== null) {
      claims.push({
        sourceKey: "steam_api",
        claim: { type: "current_players", value: currentPlayers },
        confidence: "medium",
        reasoning: "GetNumberOfCurrentPlayers — heuristic signal only, not a direct server-status claim",
        checkedAt,
      });
    }

    for (const [achievementApiName, percent] of Object.entries(globalPct)) {
      claims.push({
        sourceKey: "steam_api",
        achievementApiName,
        claim: { type: "global_unlock_percent", value: percent },
        confidence: "high",
        checkedAt,
      });
    }

    return {
      foundOnSteam: true,
      gameName: details.name,
      dlcNeeded,
      multiplayerRequired: details.multiplayerRequired,
      claims,
    };
  },
};
