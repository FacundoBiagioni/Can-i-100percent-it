import type { Facts, EvidenceClaim, DlcRequirement, ServerStatus, AnalysisStatus, ConfidenceLevel } from "../../types";

type BaseFacts = {
  gameId: number;
  gameName: string;
  foundOnSteam: boolean;
  dlcNeeded: DlcRequirement[];
  multiplayerRequired: boolean;
};

/** Pure function: combines every analyzer's claims into one Facts object. */
export function applyRules(base: BaseFacts, allClaims: EvidenceClaim[]): Facts {
  // Precise signal: a "dlc_achievement_requirement" claim whose free-text
  // DLC name the orchestrator matched against this game's own DLC list —
  // marks just that DLC as required.
  const specificallyRequiredDlcAppIds = new Set(
    allClaims
      .filter((c) => c.claim.type === "dlc_achievement_requirement" && c.dlcAppId)
      .map((c) => c.dlcAppId!),
  );
  // Fallback signal: "some paid DLC is required" with nothing specific
  // named — from the achievement-scouts community tag, or the AI
  // classifier saying so without naming a DLC. Only trusted when no DLC
  // was specifically identified, since we'd otherwise be guessing which
  // owned DLC (if more than one) is the actual gate.
  const generalDlcRequiredSignal = allClaims.some(
    (c) =>
      (c.claim.type === "dlc_required" || c.claim.type === "dlc_required_signal") &&
      c.claim.value === true,
  );
  const dlcNeeded: DlcRequirement[] = base.dlcNeeded.map((d) => ({
    ...d,
    required:
      d.required ||
      specificallyRequiredDlcAppIds.has(d.dlcAppId) ||
      (specificallyRequiredDlcAppIds.size === 0 && generalDlcRequiredSignal),
  }));

  const multiplayerRequired =
    base.multiplayerRequired ||
    allClaims.some((c) => c.claim.type === "multiplayer_required" && c.claim.value === true);

  const missableAchievements = [
    ...new Set(
      allClaims
        .filter((c) => c.claim.type === "missable" && c.achievementApiName)
        .map((c) => c.achievementApiName!),
    ),
  ];
  const buggedAchievements = [
    ...new Set(
      allClaims
        .filter((c) => c.claim.type === "bugged" && c.achievementApiName)
        .map((c) => c.achievementApiName!),
    ),
  ];
  const unobtainableAchievements = [
    ...new Set(
      allClaims
        .filter((c) => c.claim.type === "achievement_unobtainable" && c.achievementApiName)
        .map((c) => c.achievementApiName!),
    ),
  ];

  const estimatedHoursValues = allClaims
    .filter((c) => c.claim.type === "estimated_hours" && typeof c.claim.value === "number")
    .map((c) => c.claim.value as number);
  const estimatedHours =
    estimatedHoursValues.length > 0
      ? estimatedHoursValues.reduce((a, b) => a + b, 0) / estimatedHoursValues.length
      : null;

  const currentPlayersClaim = allClaims.find((c) => c.claim.type === "current_players");
  const currentPlayers =
    currentPlayersClaim && typeof currentPlayersClaim.claim.value === "number"
      ? (currentPlayersClaim.claim.value as number)
      : null;

  let serversStatus: ServerStatus = "unknown";
  if (multiplayerRequired) {
    if (currentPlayers !== null) serversStatus = currentPlayers > 0 ? "online" : "offline";
  } else {
    serversStatus = "online"; // no multiplayer dependency to worry about
  }

  return {
    gameId: base.gameId,
    gameName: base.gameName,
    foundOnSteam: base.foundOnSteam,
    dlcNeeded,
    multiplayerRequired,
    minPlayers: null,
    serversStatus,
    missableAchievements,
    buggedAchievements,
    unobtainableAchievements,
    estimatedHours,
    claims: allClaims,
  };
}

export type ConflictGroup = { key: string; claims: EvidenceClaim[] };

/** Groups claims by fact key and flags any group with disagreeing boolean values. */
export function detectConflicts(claims: EvidenceClaim[]): ConflictGroup[] {
  const byKey = new Map<string, EvidenceClaim[]>();
  for (const claim of claims) {
    const type = claim.claim.type;
    if (typeof type !== "string" || typeof claim.claim.value !== "boolean") continue;
    const key = claim.achievementApiName ? `${type}:${claim.achievementApiName}` : type;
    byKey.set(key, [...(byKey.get(key) ?? []), claim]);
  }

  const conflicts: ConflictGroup[] = [];
  for (const [key, group] of byKey) {
    const values = new Set(group.map((c) => c.claim.value));
    if (values.size > 1) conflicts.push({ key, claims: group });
  }
  return conflicts;
}

export type StatusDerivation = {
  status: AnalysisStatus;
  confidence: ConfidenceLevel;
  reasoning: string;
};

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 };

export function deriveStatus(facts: Facts, aiUsed: boolean): StatusDerivation {
  if (!facts.foundOnSteam) {
    return { status: "yellow", confidence: "high", reasoning: "This AppID was not found on Steam." };
  }

  const delistedRequiredDlc = facts.dlcNeeded.filter((d) => d.required && d.isDelisted);
  if (delistedRequiredDlc.length > 0) {
    return {
      status: "red",
      confidence: "high",
      reasoning: `Requires delisted DLC that can no longer be purchased: ${delistedRequiredDlc.map((d) => d.name).join(", ")}.`,
    };
  }

  if (facts.multiplayerRequired && facts.serversStatus === "offline") {
    return {
      status: "red",
      confidence: "medium",
      reasoning: "Requires multiplayer, and the current player count is zero — servers appear inactive.",
    };
  }

  // AI-classified signal from Steam forum discussions — e.g. an achievement
  // tied to delisted/never-released promo DLC that Steam's own metadata
  // doesn't expose at all (appdetails.dlc is empty for these).
  const unobtainableClaim = facts.claims.find(
    (c) => c.claim.type === "achievement_unobtainable_signal" && c.claim.value === true,
  );
  if (unobtainableClaim) {
    return {
      status: unobtainableClaim.confidence === "high" ? "red" : "yellow",
      confidence: unobtainableClaim.confidence,
      reasoning: String(
        unobtainableClaim.reasoning ?? "Steam Community discussions suggest an achievement may be permanently unobtainable.",
      ),
    };
  }

  const buggedReportClaim = facts.claims.find((c) => c.claim.type === "bugged_achievements_reported");
  if (facts.buggedAchievements.length > 0 || buggedReportClaim) {
    return {
      status: "yellow",
      confidence: "low",
      reasoning: buggedReportClaim
        ? String(buggedReportClaim.reasoning ?? "Some completers report broken achievement unlocks.")
        : `Reported bugged achievements: ${facts.buggedAchievements.join(", ")}.`,
    };
  }

  // Only claims that actually gate the verdict count toward the confidence
  // floor — informational metadata (estimated playtime, raw player counts,
  // per-achievement unlock rarity) shouldn't turn a clean result yellow.
  // DLC requirement is here too: unlike delisted DLC (its own red path
  // above) or missable/bugged achievements, a required-but-purchasable DLC
  // is disclosed (icon + cost) but never itself a blocker, so an unsure
  // reading of it (e.g. a Wikipedia article that just doesn't discuss DLC)
  // shouldn't make an otherwise-clean game provisional.
  const INFORMATIONAL_CLAIM_TYPES = new Set([
    "estimated_hours",
    "current_players",
    "global_unlock_percent",
    "dlc_required_signal",
    "dlc_achievement_requirement",
  ]);
  // Community tags describing mechanics rather than completion risk (a
  // single stray vote on "Steam Inventory" shouldn't make a clean game
  // provisional the same way "MP Required" should).
  const NON_BLOCKING_TAG_SLUGS = new Set([
    "controller-required",
    "multiple-playthroughs",
    "chapter-select",
    "new-game-plus",
    "cheese-available",
    "steam-inventory",
    "mobile-cross-save",
    "completion-achievement",
  ]);
  const verdictRelevantClaims = facts.claims.filter((c) => {
    if (typeof c.claim.type !== "string") return true;
    if (INFORMATIONAL_CLAIM_TYPES.has(c.claim.type)) return false;
    if (c.claim.type === "community_tag" && typeof c.claim.slug === "string" && NON_BLOCKING_TAG_SLUGS.has(c.claim.slug)) {
      return false;
    }
    return true;
  });

  const lowestConfidence = verdictRelevantClaims.reduce<ConfidenceLevel>(
    (worst, c) => (CONFIDENCE_RANK[c.confidence] < CONFIDENCE_RANK[worst] ? c.confidence : worst),
    "high",
  );

  if (lowestConfidence === "low" && !aiUsed) {
    return {
      status: "yellow",
      confidence: "low",
      reasoning: "Evidence is thin or unverified for at least one requirement — treat this result as provisional.",
    };
  }

  const requirements: string[] = [];
  if (facts.dlcNeeded.some((d) => d.required)) requirements.push("DLC");
  if (facts.multiplayerRequired) requirements.push("multiplayer");

  return {
    status: "green",
    confidence: lowestConfidence,
    reasoning:
      requirements.length > 0
        ? `100% appears obtainable. Requires: ${requirements.join(", ")}.`
        : "100% appears obtainable with no known blockers.",
  };
}
