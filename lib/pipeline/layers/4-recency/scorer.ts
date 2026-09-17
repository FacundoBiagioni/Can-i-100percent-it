import type { EvidenceClaim, ConfidenceLevel } from "../../types";

const DECAY_DAYS = 180;
const DOWNGRADE: Record<ConfidenceLevel, ConfidenceLevel> = { high: "medium", medium: "low", low: "low" };

/** Downgrades (never upgrades) confidence on claims older than the decay window. */
export function applyRecencyDecay(claims: EvidenceClaim[], now = new Date()): EvidenceClaim[] {
  return claims.map((claim) => {
    const ageDays = (now.getTime() - claim.checkedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > DECAY_DAYS) {
      return { ...claim, confidence: DOWNGRADE[claim.confidence] };
    }
    return claim;
  });
}
