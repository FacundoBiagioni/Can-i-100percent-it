"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";

/**
 * EN / ES switch. Saves the choice in a cookie (a year), flips client text
 * immediately, then re-renders the server parts in place with
 * router.refresh(): no full page reload, and scroll position, inputs and
 * open panels survive.
 */
export default function LanguageToggle() {
  const router = useRouter();
  const t = useT();
  const { locale, setLocale } = useLocale();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next: Locale = locale === "en" ? "es" : "en";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = next;
    setLocale(next);
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t.nav.switchLanguage}
      title={t.nav.switchLanguage}
      className={`flex h-8 shrink-0 cursor-pointer items-center gap-1 px-1 text-nav font-medium transition-opacity ${pending ? "opacity-60" : ""}`}
    >
      <span className={locale === "en" ? "text-chalk" : "text-graphite transition-colors hover:text-ash"}>EN</span>
      <span aria-hidden className="text-carbon">/</span>
      <span className={locale === "es" ? "text-chalk" : "text-graphite transition-colors hover:text-ash"}>ES</span>
    </button>
  );
}
