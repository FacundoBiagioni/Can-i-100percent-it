import type { DlcRequirement, EvidenceClaim } from "../types";

/** Stand-in appId for a required DLC that Steam no longer sells or lists. */
export const UNLISTED_DLC_APP_ID = 0;
const MAX_EVIDENCE = 5;

/**
 * When SteamHunters says 100% needs paid DLC but none of the DLC Steam still
 * lists can be bought, the DLC that gates those achievements is gone from
 * the store, often from its DLC list too (Assassin's Creed Revelations' "The
 * Lost Archive": its achievements are still in the game, the DLC isn't on
 * Steam at all). The mapping still finds the right achievements, but can
 * only pin them on whatever is listed, e.g. a character pack. So instead of
 * naming a DLC that may be the wrong one, the result says "a DLC Steam no
 * longer sells", with the achievements that need it.
 *
 * Returns that single entry, or null when the rule doesn't apply.
 */
export function unlistedDlcRequirement(
  required: Map<number, string[]>,
  catalog: { exists: boolean; purchasable: boolean }[],
  claims: EvidenceClaim[],
): DlcRequirement | null {
  const paidDlcRequired = claims.some((c) => c.claim.type === "paid_dlc_required" && c.claim.value === true);
  if (!paidDlcRequired || required.size === 0 || catalog.length === 0) return null;
  if (catalog.some((d) => d.exists && d.purchasable)) return null;
  return {
    dlcAppId: UNLISTED_DLC_APP_ID,
    name: "",
    priceCents: null,
    required: true,
    isDelisted: true,
    unlisted: true,
    evidence: [...new Set([...required.values()].flat())].slice(0, MAX_EVIDENCE),
  };
}
