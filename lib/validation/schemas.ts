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

export const appDetailsDataSchema = z.object({
  type: z.string(),
  name: z.string(),
  steam_appid: z.number(),
  is_free: z.boolean().optional(),
  dlc: z.array(z.number()).optional().default([]),
  header_image: z.string().optional(),
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
