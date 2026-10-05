/** Every price in the app comes from Steam's Argentina storefront (regional
 * pricing), which Valve denominates in USD. One formatter (and one label,
 * t.priceRegion), so no surface ever shows a figure from a different region
 * or currency. */

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatPrice(cents: number) {
  return usd.format(cents / 100);
}
