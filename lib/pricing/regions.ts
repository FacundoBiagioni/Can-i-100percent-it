/**
 * Store regions. Prices come from the Steam store of one country: by default
 * the visitor's own (from their IP, via Vercel's geolocation header), or one
 * they pick in settings. Shared by server and client code.
 */

/** "auto" or a country code; kept a year. */
export const REGION_COOKIE = "region";
export const AUTO_REGION = "auto";
/** When the country can't be detected (local dev, unknown IPs). */
export const FALLBACK_REGION = "US";

/**
 * Countries offered in the settings menu: Steam's regional pricing markets
 * (each has its own prices), plus the larger euro-area countries, which
 * share one. A detected country outside this list still works.
 */
export const STORE_REGIONS = [
  "AR", "AU", "AT", "BE", "BR", "CA", "CL", "CN", "CO", "CR", "DE", "DK", "ES", "FI", "FR", "GB", "GR", "HK",
  "ID", "IE", "IL", "IN", "IT", "JP", "KR", "KW", "KZ", "MX", "MY", "NL", "NO", "NZ", "PE", "PH", "PL", "PT",
  "QA", "RU", "SA", "SE", "SG", "TH", "TR", "TW", "UA", "AE", "US", "UY", "VN", "ZA", "CH",
];

export const isCountryCode = (value: unknown): value is string => typeof value === "string" && /^[A-Z]{2}$/.test(value);

/** What the server resolved for this visitor, also handed to the client. */
export type RegionInfo = {
  /** Country whose Steam store prices are shown. */
  cc: string;
  /** true when following the visitor's location (no manual pick). */
  auto: boolean;
  /** Country from the visitor's IP, when known. */
  detected: string | null;
  /** ISO currency code of that store (e.g. BRL, EUR, USD). */
  currency: string;
};

export function countryName(cc: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(cc) ?? cc;
  } catch {
    return cc;
  }
}
