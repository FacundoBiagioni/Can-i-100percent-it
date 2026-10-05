import { en, type Dictionary } from "./dictionaries/en";
import { es } from "./dictionaries/es";

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
/** The visitor's choice, kept a year; read on the server for every render. */
export const LOCALE_COOKIE = "lang";

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

export const DICTIONARIES: Record<Locale, Dictionary> = { en, es };
