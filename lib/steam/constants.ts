// Verified live 2026-09-16 against the real endpoints (see plan doc for details).
export const STEAM_WEB_API_BASE = "https://api.steampowered.com";
export const STEAM_STOREFRONT_BASE = "https://store.steampowered.com/api";

export const STEAM_ENDPOINTS = {
  storeSearch: `${STEAM_STOREFRONT_BASE}/storesearch/`,
  appDetails: `${STEAM_STOREFRONT_BASE}/appdetails`,
  schemaForGame: `${STEAM_WEB_API_BASE}/ISteamUserStats/GetSchemaForGame/v2/`,
  globalAchievementPercentages: `${STEAM_WEB_API_BASE}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/`,
  currentPlayers: `${STEAM_WEB_API_BASE}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/`,
};

// Category descriptions from appdetails().categories that signal a multiplayer/co-op requirement.
export const MULTIPLAYER_CATEGORY_MARKERS = [
  "Multi-player",
  "Co-op",
  "Online Co-op",
  "Online PvP",
  "PvP",
  "Shared/Split Screen Co-op",
  "Shared/Split Screen PvP",
  "Cross-Platform Multiplayer",
  "MMO",
];
