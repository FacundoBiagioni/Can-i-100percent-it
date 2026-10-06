/** Every price in the app comes from one Steam store, the visitor's region
 * (lib/pricing), in that store's own currency. Steam counts every currency
 * in hundredths (¥1,700 is 170000), so the same division always applies;
 * Intl then shows the right decimals for the currency (none for yen). */
export function formatPrice(cents: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}
