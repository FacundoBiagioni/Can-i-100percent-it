import { cookies, headers } from "next/headers";
import { AUTO_REGION, FALLBACK_REGION, REGION_COOKIE, isCountryCode, type RegionInfo } from "./regions";
import { getRegionCurrency } from "./steamPrices";

/**
 * The store region for this request: the visitor's pick from settings, or
 * else their country from the IP (Vercel adds x-vercel-ip-country to every
 * request), or else the US store. Works in pages, layouts and route handlers.
 */
export async function getRegion(): Promise<RegionInfo> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const picked = cookieStore.get(REGION_COOKIE)?.value?.toUpperCase();
  const header = headerStore.get("x-vercel-ip-country")?.toUpperCase();
  const detected = isCountryCode(header) ? header : null;
  const manual = picked && picked !== AUTO_REGION.toUpperCase() && isCountryCode(picked) ? picked : null;
  const cc = manual ?? detected ?? FALLBACK_REGION;
  return { cc, auto: !manual, detected, currency: await getRegionCurrency(cc) };
}
