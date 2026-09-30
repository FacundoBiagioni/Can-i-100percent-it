export const CacheTTL = {
  steamSearch: 60 * 60, // 1h
  steamAppDetails: 60 * 60 * 24, // 24h
  steamArPricing: 60 * 60 * 24, // 24h
  steamSchema: 60 * 60 * 24 * 7, // 7d
  steamGlobalPct: 60 * 60 * 6, // 6h
  steamCurrentPlayers: 60 * 5, // 5m
  scrapeSuccess: 60 * 60 * 24, // 24h
  scrapeFailure: 60 * 60, // 1h, negative cache
  analysis: 60 * 10, // 10m
  pipelineLock: 60 * 5, // 5m
  itadLookup: 60 * 60 * 24 * 30, // 30d — appid->uuid mapping is effectively permanent
  itadDeal: 60 * 60 * 12, // 12h
} as const;

export const CacheKeys = {
  steamSearch: (query: string) => `steam:search:${query.toLowerCase()}`,
  steamAppDetails: (appId: number) => `steam:appdetails:${appId}`,
  steamArPricing: (appId: number) => `steam:pricing:ar:${appId}`,
  steamSchema: (appId: number) => `steam:schema:${appId}`,
  steamGlobalPct: (appId: number) => `steam:globalpct:${appId}`,
  steamCurrentPlayers: (appId: number) => `steam:currentplayers:${appId}`,
  scrape: (source: string, appId: number) => `scrape:${source}:${appId}`,
  analysis: (appId: number) => `analysis:${appId}`,
  pipelineLock: (appId: number) => `lock:pipeline:${appId}`,
  itadLookup: (appId: number) => `itad:lookup:${appId}`,
  itadDeal: (appId: number) => `itad:deal:ar:${appId}`,
};
