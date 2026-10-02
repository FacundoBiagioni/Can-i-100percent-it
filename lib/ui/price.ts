/** Every price in the app comes from Steam's Argentina storefront (regional
 * pricing), which Valve denominates in USD. One label, one formatter, so no
 * surface ever shows a figure from a different region or currency. */
export const PRICE_REGION_LABEL = "Steam Argentina prices, in USD";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatPrice(cents: number) {
  return usd.format(cents / 100);
}
