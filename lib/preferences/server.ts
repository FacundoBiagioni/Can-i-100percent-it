import { cookies } from "next/headers";
import { MOTION_COOKIE, SPOILERS_COOKIE, type Preferences } from "./config";

export async function getPreferences(): Promise<Preferences> {
  const store = await cookies();
  return {
    reduceMotion: store.get(MOTION_COOKIE)?.value === "off",
    // On by default: only an explicit "show" turns it off.
    hideSpoilers: store.get(SPOILERS_COOKIE)?.value !== "show",
  };
}
