"use client";

import { createContext, useContext } from "react";
import { formatPrice } from "@/lib/ui/price";
import { useT } from "@/lib/i18n/client";
import type { RegionInfo } from "./regions";

const RegionContext = createContext<RegionInfo | null>(null);

/** The server-resolved store region, for client components. A change in
 * settings re-renders the server, which passes the new region down. */
export function RegionProvider({ region, children }: { region: RegionInfo; children: React.ReactNode }) {
  return <RegionContext.Provider value={region}>{children}</RegionContext.Provider>;
}

export function useRegion(): RegionInfo {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion outside RegionProvider");
  return ctx;
}

/** Formats a price in the current store's currency and the page language. */
export function useFormatPrice() {
  const { currency } = useRegion();
  const t = useT();
  return (cents: number) => formatPrice(cents, currency, t.numberLocale);
}
