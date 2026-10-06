/** Display preferences from the settings menu, kept in cookies (a year) so
 * the server renders pages with them already applied. Shared by server and
 * client code. */
export const MOTION_COOKIE = "motion"; // "off" = reduce animations
export const SPOILERS_COOKIE = "spoilers"; // "show" = uncover hidden achievements (covered by default)

export type Preferences = { reduceMotion: boolean; hideSpoilers: boolean };

/** Fired on window when "reduce animations" changes, so running animations
 * can pause or resume without being rebuilt. */
export const MOTION_EVENT = "app:motionchange";

/** True when animations should hold still: the setting (mirrored on
 * <html data-motion="off">) or the system's reduced-motion preference. */
export function motionReduced(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.dataset.motion === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
