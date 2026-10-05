"use client";

import { createContext, useContext, useState } from "react";
import { DICTIONARIES, type Locale } from "./config";

type I18n = { locale: Locale; setLocale: (locale: Locale) => void };
const I18nContext = createContext<I18n | null>(null);

/**
 * Client components read the language from here. The server passes in the
 * cookie's value; switching updates client text at once, and the server
 * components follow after a router.refresh() (see LanguageToggle).
 */
export function I18nProvider({ locale: serverLocale, children }: { locale: Locale; children: React.ReactNode }) {
  const [locale, setLocale] = useState(serverLocale);
  // Adopt a new server value (e.g. the cookie changed in another tab and a
  // navigation picked it up) without an effect: React's "adjust state when a
  // prop changes" pattern.
  const [lastServerLocale, setLastServerLocale] = useState(serverLocale);
  if (serverLocale !== lastServerLocale) {
    setLastServerLocale(serverLocale);
    setLocale(serverLocale);
  }
  return <I18nContext.Provider value={{ locale, setLocale }}>{children}</I18nContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLocale outside I18nProvider");
  return ctx;
}

export function useT() {
  return DICTIONARIES[useLocale().locale];
}
