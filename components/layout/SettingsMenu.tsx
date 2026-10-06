"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Settings } from "lucide-react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";
import { useRegion } from "@/lib/pricing/client";
import { AUTO_REGION, REGION_COOKIE, STORE_REGIONS, countryName } from "@/lib/pricing/regions";

const LANGUAGES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

function setDocumentLanguage(locale: Locale) {
  document.documentElement.lang = locale;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * The gear in the navbar: language and store region. Both are cookies (a
 * year); a change re-renders the server parts in place with
 * router.refresh(), so there's no full reload and the page keeps its state.
 */
export default function SettingsMenu() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const region = useRegion();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const regionId = useId();

  // Close on Escape or a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // Every offered store, plus the detected and current ones if they're not
  // in the list, sorted by name in the page's language.
  const countries = useMemo(() => {
    const codes = new Set([...STORE_REGIONS, region.cc, ...(region.detected ? [region.detected] : [])]);
    return [...codes]
      .map((cc) => ({ cc, name: countryName(cc, t.numberLocale) }))
      .sort((a, b) => a.name.localeCompare(b.name, t.numberLocale));
  }, [region.cc, region.detected, t.numberLocale]);

  function changeLanguage(next: Locale) {
    if (next === locale) return;
    setCookie(LOCALE_COOKIE, next);
    setDocumentLanguage(next);
    setLocale(next);
    startTransition(() => router.refresh());
  }

  function changeRegion(value: string) {
    setCookie(REGION_COOKIE, value);
    startTransition(() => router.refresh());
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t.nav.settings}
        title={t.nav.settings}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center transition-colors ${
          open ? "text-chalk" : "text-ash hover:text-chalk"
        }`}
      >
        <Settings
          aria-hidden
          className={`h-[18px] w-[18px] transition-transform duration-300 ${open ? "rotate-90" : ""} ${pending ? "motion-safe:animate-spin" : ""}`}
          strokeWidth={1.75}
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t.settings.title}
          className="absolute right-0 top-full z-50 mt-1 flex w-[min(18rem,calc(100vw-2rem))] flex-col gap-5 border border-carbon bg-void p-4 shadow-[0_24px_48px_-16px_rgb(0_0_0/0.9)]"
        >
          <p className="text-caption text-graphite">{t.settings.title}</p>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-nav text-ash">{t.settings.language}</legend>
            <div className="grid grid-cols-2 pl-px pt-px">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  aria-pressed={locale === l.value}
                  onClick={() => changeLanguage(l.value)}
                  className={`-ml-px -mt-px h-9 cursor-pointer border text-nav font-medium transition-colors ${
                    locale === l.value ? "border-fog bg-chalk text-void" : "border-carbon text-ash hover:border-fog hover:text-chalk"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor={regionId} className="text-nav text-ash">
              {t.settings.region}
            </label>
            <div className="relative">
              <select
                id={regionId}
                value={region.auto ? AUTO_REGION : region.cc}
                onChange={(e) => changeRegion(e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none border border-cinder bg-cinder pl-3 pr-9 text-body text-chalk outline-none transition-colors focus:border-fog"
              >
                <option value={AUTO_REGION}>
                  {region.detected
                    ? t.settings.automatic(countryName(region.detected, t.numberLocale))
                    : t.settings.automaticUnknown}
                </option>
                {countries.map((c) => (
                  <option key={c.cc} value={c.cc}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite" />
            </div>
            <p className="text-caption text-graphite">{t.settings.regionHint}</p>
          </div>
        </div>
      )}
    </div>
  );
}
