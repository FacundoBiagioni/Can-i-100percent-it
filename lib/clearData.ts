import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { REGION_COOKIE } from "@/lib/pricing/regions";
import { MOTION_COOKIE, SPOILERS_COOKIE } from "@/lib/preferences/config";

// Everything this site keeps in the browser. A new storage key or cookie
// must be added here too, or "Clear my data" misses it.
const STORAGE_KEYS = ["recent-games", "following", "library-profile"];
const COOKIES = [LOCALE_COOKIE, REGION_COOKIE, MOTION_COOKIE, SPOILERS_COOKIE];

/** Removes everything the site saved in this browser: recent and followed
 * games, the Library profile link, and the settings cookies. */
export function clearSiteData() {
  for (const key of STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage blocked: there's nothing stored to remove either.
    }
  }
  for (const name of COOKIES) document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}
