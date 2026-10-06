import type { Facts, EvidenceClaim, DlcRequirement, ServerStatus, AnalysisStatus, ConfidenceLevel } from "../../types";

type BaseFacts = {
  gameId: number;
  gameName: string;
  foundOnSteam: boolean;
  dlcNeeded: DlcRequirement[];
  multiplayerRequired: boolean;
};

/** SteamHunters tracks this game: its curated list of unobtainable
 * achievements is then the source of truth for "is 100% still possible". */
export function steamHuntersTracks(claims: EvidenceClaim[]): boolean {
  return claims.some((c) => c.sourceKey === "steamhunters" && c.claim.type === "unobtainable_count");
}

/** Pure function: combines every analyzer's claims into one Facts object. */
export function applyRules(base: BaseFacts, allClaims: EvidenceClaim[]): Facts {
  // Which DLC are required is decided before this point, by
  // resolveRequiredDlc (SteamHunters gate + achievement-to-DLC mapping); the
  // free-text DLC claims from forums/guides/Wikipedia are only context for
  // that step, never a flag on their own.
  const dlcNeeded = base.dlcNeeded;
  const curated = steamHuntersTracks(allClaims);

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
  // With SteamHunters' curated list available, AI reads of forum threads
  // don't get to add "unobtainable" achievements on top of it.
  const unobtainableAchievements = [
    ...new Set(
      allClaims
        .filter(
          (c) =>
            c.claim.type === "achievement_unobtainable" &&
            c.achievementApiName &&
            (!curated || c.sourceKey === "steamhunters"),
        )
        .map((c) => c.achievementApiName!),
    ),
  ];

  // SteamHunters' median (thousands of real 100% runs on popular games) wins;
  // other sources only fill in where it has no figure.
  const hoursClaims = allClaims.filter((c) => c.claim.type === "estimated_hours" && typeof c.claim.value === "number");
  const steamHuntersHours = hoursClaims.filter((c) => c.sourceKey === "steamhunters");
  const estimatedHoursValues = (steamHuntersHours.length > 0 ? steamHuntersHours : hoursClaims).map((c) => c.claim.value as number);
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
    if (currentPlayers !== null && currentPlayers > 0) serversStatus = "online";
    // Zero players at one moment doesn't prove servers are gone (off-peak
    // hours, a small game). When SteamHunters tracks the game, a real
    // shutdown shows up as its online achievements marked unobtainable, so
    // only call servers "offline" when that has happened.
    else if (currentPlayers === 0) serversStatus = curated && unobtainableAchievements.length === 0 ? "unknown" : "offline";
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

export type StatusDerivation = {
  status: AnalysisStatus;
  confidence: ConfidenceLevel;
  reasoning: string;
};

function namesOf(facts: Facts, apiNames: string[]): string[] {
  const byApi = new Map(
    facts.claims
      .filter((c) => c.claim.type === "achievement_unobtainable" && c.achievementApiName && typeof c.claim.name === "string")
      .map((c) => [c.achievementApiName!, String(c.claim.name)]),
  );
  return apiNames.map((a) => byApi.get(a) ?? a);
}

function listNames(names: string[], max = 3): string {
  const shown = names.slice(0, max).map((n) => `"${n}"`);
  return names.length > max ? `${shown.join(", ")} and ${names.length - max} more` : shown.join(", ");
}

/**
 * Red = 100% is impossible today, and only on hard evidence: achievements a
 * curated source marks unobtainable, or required DLC that can't be bought.
 * Yellow = there's a credible report of a block that can't be confirmed.
 * Green otherwise. Bugged, missable and DLC findings are disclosed through
 * their own icons but never change the color: none of them stop 100%.
 *
 * When SteamHunters tracks a game, its curated list decides; AI reads of
 * forum threads (which vary from run to run and confuse one-save lockouts,
 * bugs and old patches with real blocks) are only used for games it doesn't
 * track, and even then one source alone can't make a game red.
 */
export function deriveStatus(facts: Facts): StatusDerivation {
  if (!facts.foundOnSteam) {
    return { status: "yellow", confidence: "high", reasoning: "This AppID was not found on Steam." };
  }

  const delistedRequiredDlc = facts.dlcNeeded.filter((d) => d.required && d.isDelisted);
  if (delistedRequiredDlc.length > 0) {
    const named = delistedRequiredDlc.filter((d) => !d.unlisted).map((d) => d.name);
    return {
      status: "red",
      confidence: "high",
      reasoning:
        named.length > 0
          ? `Requires DLC that can no longer be purchased: ${named.join(", ")}.`
          : "Requires a DLC that Steam no longer sells.",
    };
  }

  const requirements: string[] = [];
  if (facts.dlcNeeded.some((d) => d.required)) requirements.push("DLC");
  if (facts.multiplayerRequired) requirements.push("multiplayer");
  const greenReasoning =
    requirements.length > 0
      ? `100% appears obtainable. Requires: ${requirements.join(", ")}.`
      : "100% appears obtainable with no known blockers.";

  if (steamHuntersTracks(facts.claims)) {
    if (facts.unobtainableAchievements.length > 0) {
      const names = namesOf(facts, facts.unobtainableAchievements);
      // Still red (they can't be unlocked today), but when every one of them
      // is only waiting for its content to be added, say so.
      const upcoming = new Set(
        facts.claims
          .filter((c) => c.claim.type === "achievement_unobtainable" && c.claim.upcoming === true && c.achievementApiName)
          .map((c) => c.achievementApiName!),
      );
      const allUpcoming = facts.unobtainableAchievements.every((a) => upcoming.has(a));
      return {
        status: "red",
        confidence: "high",
        reasoning: allUpcoming
          ? names.length === 1
            ? `1 achievement can't be unlocked yet: ${listNames(names)}. Its content isn't in the game yet; it should become obtainable once it's added.`
            : `${names.length} achievements can't be unlocked yet: ${listNames(names)}. Their content isn't in the game yet; they should become obtainable once it's added.`
          : `${names.length} achievement${names.length === 1 ? " is" : "s are"} no longer obtainable: ${listNames(names)}.`,
      };
    }
    return { status: "green", confidence: "high", reasoning: greenReasoning };
  }

  // --- Not tracked by SteamHunters: weaker, uncurated evidence only. ---
  if (facts.multiplayerRequired && facts.serversStatus === "offline") {
    return {
      status: "red",
      confidence: "medium",
      reasoning: "Requires multiplayer, and the current player count is zero, so servers appear inactive.",
    };
  }

  const unobtainableReports = facts.claims.filter(
    (c) => c.claim.type === "achievement_unobtainable_signal" && c.claim.value === true && c.confidence !== "low",
  );
  const reportingSources = new Set(unobtainableReports.map((c) => c.sourceKey));
  if (reportingSources.size >= 2) {
    return {
      status: "red",
      confidence: "medium",
      reasoning: String(unobtainableReports[0].reasoning ?? "Several sources report an achievement that can no longer be earned."),
    };
  }
  if (reportingSources.size === 1) {
    return {
      status: "yellow",
      confidence: "medium",
      reasoning: `Unconfirmed: ${String(unobtainableReports[0].reasoning ?? "one source reports an achievement that may no longer be earnable.")}`,
    };
  }

  // Nothing curated and none of the text sources could be read (e.g. the AI
  // step was unavailable): say so instead of claiming a clean result.
  const textSourcesRead = facts.claims.some((c) => c.claim.type === "achievement_unobtainable_signal");
  if (!textSourcesRead) {
    return {
      status: "yellow",
      confidence: "low",
      reasoning: "Not enough data to confirm this game yet: no curated achievement data, and community sources couldn't be read.",
    };
  }

  return { status: "green", confidence: "medium", reasoning: greenReasoning };
}
