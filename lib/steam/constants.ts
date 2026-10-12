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
