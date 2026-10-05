import { z } from "zod";

// --- storesearch (verified live against store.steampowered.com/api/storesearch) ---
export const storeSearchItemSchema = z.object({
  type: z.string(),
  name: z.string(),
  id: z.number(), // this IS the Steam AppID
  tiny_image: z.string().optional(),
});

export const storeSearchResponseSchema = z.object({
  total: z.number(),
  items: z.array(storeSearchItemSchema),
});

// --- appdetails (verified live against store.steampowered.com/api/appdetails) ---
export const appDetailsCategorySchema = z.object({
  id: z.number(),
  description: z.string(),
});

export const appDetailsScreenshotSchema = z.object({
  path_full: z.string(),
});

export const appDetailsDataSchema = z.object({
  type: z.string(),
  name: z.string(),
  steam_appid: z.number(),
  is_free: z.boolean().optional(),
  dlc: z.array(z.number()).optional().default([]),
  // Set on DLC apps: the base game they belong to (appid comes as a string).
  fullgame: z.object({ appid: z.coerce.number() }).optional(),
  header_image: z.string().optional(),
  background_raw: z.string().optional(),
  // background_raw is a deliberately faint store-page background (meant to
  // sit behind store text at low opacity) — too muted for a bold full-bleed
  // hero. A real gameplay screenshot looks far better full-screen; verified
  // live against Hollow Knight's appdetails response.
  screenshots: z.array(appDetailsScreenshotSchema).optional().default([]),
  categories: z.array(appDetailsCategorySchema).optional().default([]),
  release_date: z
    .object({ coming_soon: z.boolean(), date: z.string() })
    .optional(),
  price_overview: z
    .object({
      currency: z.string(),
      initial: z.number(),
      final: z.number(),
      discount_percent: z.number(),
    })
    .optional(),
});

export function appDetailsResponseSchema(appId: number) {
  return z.object({
    [String(appId)]: z.object({
      success: z.boolean(),
      data: appDetailsDataSchema.optional(),
    }),
  });
}

// --- GetSchemaForGame — response shape is well-established across community
// Steam API clients but NOT confirmed live (endpoint requires an API key we
// don't have yet). Kept permissive (.optional()/.catch()) so an unexpected
// shape degrades gracefully instead of throwing; re-verify live once
// STEAM_API_KEY is available.
export const steamAchievementSchema = z.object({
  name: z.string(),
  displayName: z.string().optional().default(""),
  description: z.string().optional(),
  hidden: z.number().optional().default(0),
  icon: z.string().optional(),
});

export const schemaForGameResponseSchema = z.object({
  game: z.object({
    gameName: z.string().optional(),
    availableGameStats: z
      .object({
        achievements: z.array(steamAchievementSchema).optional().default([]),
      })
      .optional(),
  }),
});

// --- GetGlobalAchievementPercentagesForApp (verified live) ---
export const globalAchievementPercentagesResponseSchema = z.object({
  achievementpercentages: z.object({
    achievements: z.array(
      z.object({
        name: z.string(),
        percent: z.coerce.number(),
      }),
    ),
  }),
});

// --- GetNumberOfCurrentPlayers (verified live) ---
export const currentPlayersResponseSchema = z.object({
  response: z.object({
    player_count: z.number().optional(),
    result: z.number(),
  }),
});

// --- Achievement Scouts internal API (achievement-scouts.com/api/v1) —
// verified live against real endpoints. This is an undocumented internal
// API (not a public contract), kept behind safeParse everywhere so a
// silent shape change degrades to an empty claim instead of throwing.
export const scoutStatsResponseSchema = z.object({
  players: z.number(),
  completers: z.number(),
  fastest_completion: z.number().nullable().optional(), // minutes
  median_completion: z.number().nullable().optional(), // minutes
});

export const communityTagResponseSchema = z.object({
  slug: z.string(),
  name: z.string(),
  is_applied: z.boolean(),
  vote_count: z.number(),
});

export const communityTagsResponseSchema = z.array(communityTagResponseSchema);

// --- Achievement Scouts curations (/curations/by-app/{appId}) — verified
// live 2026-10-02. Short human-written notes from the Achievement Scouts
// Steam curator groups, e.g. "Paid 'Phantom Liberty' DLC required."
export const curationsResponseSchema = z.array(
  z.object({
    blurb: z.string().nullable().optional(),
    curation_url: z.string().nullable().optional(),
  }),
);

// --- SteamHunters public API (steamhunters.com/api/apps/{appId}) — verified
// live 2026-10-02. Unlike the HTML pages (Cloudflare-challenged), this JSON
// route answers plain requests. hasPaidDlc is SteamHunters' own curated
// flag for "100% needs paid DLC": it was false for every game checked whose
// DLC adds no achievements (Dark Souls III, ACE COMBAT 7, LEGO Skywalker
// Saga, V Rising) and true for every game whose curator note names a
// required DLC.
export const steamHuntersAppResponseSchema = z.object({
  appId: z.number(),
  hasPaidDlc: z.boolean(),
  unobtainableAchievementCount: z.number().optional().default(0),
});

// --- IStoreBrowseService/GetItems — verified live 2026-10-02. Batch store
// lookup (one request for up to 100 apps) used for DLC lists, which can run
// to hundreds of entries: one appdetails call per DLC trips Steam's rate
// limit (~200 requests / 5 min) on games like Monster Hunter: World.
// success 1 = found; any other value = Steam's store doesn't know the app.
// type 4 = DLC, 11 = soundtrack, 0 = game.
export const storeItemsResponseSchema = z.object({
  response: z.object({
    store_items: z
      .array(
        z.object({
          appid: z.number().optional(),
          id: z.number().optional(),
          success: z.number(),
          type: z.number().optional(),
          name: z.string().optional(),
          is_free: z.boolean().optional(),
          basic_info: z.object({ short_description: z.string().optional() }).optional(),
          release: z.object({ is_coming_soon: z.boolean().optional() }).optional(),
          best_purchase_option: z.object({}).passthrough().optional(),
          purchase_options: z.array(z.object({}).passthrough()).optional(),
        }),
      )
      .optional()
      .default([]),
  }),
});

// --- SteamHunters achievement list (steamhunters.com/api/apps/{appId}/
// achievements) — verified live 2026-10-04. obtainability is SteamHunters'
// community-curated status per achievement; 3 = unobtainable (servers shut
// down, removed content, ended events...). Checked across a dozen games, the
// number of 3s always equals the app's own unobtainableAchievementCount. The
// other non-zero codes (1, 2) aren't documented anywhere public, so they're
// deliberately not interpreted.
export const steamHuntersAchievementsResponseSchema = z.array(
  z.object({
    apiName: z.string(),
    name: z.string(),
    obtainability: z.number(),
  }),
);

// --- Library import (verified live 2026-10-05) -------------------------------
// ISteamUser/ResolveVanityURL: success 1 = found, 42 = no match.
export const resolveVanityResponseSchema = z.object({
  response: z.object({ success: z.number(), steamid: z.string().optional() }),
});

// ISteamUser/GetPlayerSummaries: communityvisibilitystate 3 = public profile.
export const playerSummariesResponseSchema = z.object({
  response: z.object({
    players: z.array(
      z.object({
        steamid: z.string(),
        personaname: z.string(),
        avatarfull: z.string().optional(),
        communityvisibilitystate: z.number().optional(),
      }),
    ),
  }),
});

// IPlayerService/GetOwnedGames: `games` is missing entirely when the game
// list is private. has_community_visible_stats marks games with achievements.
export const ownedGamesResponseSchema = z.object({
  response: z.object({
    game_count: z.number().optional(),
    games: z
      .array(
        z.object({
          appid: z.number(),
          name: z.string().optional(),
          playtime_forever: z.number().optional().default(0),
          has_community_visible_stats: z.boolean().optional(),
        }),
      )
      .optional(),
  }),
});

// SteamHunters bulk app lookup (/api/apps?appIds=..., at most 100 ids).
export const steamHuntersBulkResponseSchema = z.array(
  z.object({
    appId: z.number(),
    hasPaidDlc: z.boolean(),
    unobtainableAchievementCount: z.number().optional().default(0),
  }),
);

// IPlayerService/GetTopAchievementsForGames: `achievements` holds every
// achievement the player unlocked (up to max_achievements), by display name.
// Empty `response` when the player's game details are hidden.
export const topAchievementsResponseSchema = z.object({
  response: z.object({
    games: z
      .array(
        z.object({
          appid: z.number(),
          total_achievements: z.number().optional().default(0),
          achievements: z.array(z.object({ name: z.string() })).optional().default([]),
        }),
      )
      .optional()
      .default([]),
  }),
});

// GetItems with include_assets: asset_url_format is e.g.
// "steam/apps/440/${FILENAME}?t=..." relative to the store_item_assets CDN.
export const storeAssetsResponseSchema = z.object({
  response: z.object({
    store_items: z
      .array(
        z.object({
          appid: z.number().optional(),
          success: z.number(),
          assets: z
            .object({
              asset_url_format: z.string().optional(),
              library_capsule: z.string().optional(),
              header: z.string().optional(),
            })
            .optional(),
        }),
      )
      .optional()
      .default([]),
  }),
});
