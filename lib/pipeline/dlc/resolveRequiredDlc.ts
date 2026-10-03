import { Type } from "@google/genai";
import { z } from "zod";
import { generateJson } from "@/lib/ai/gemini";
import type { ConfidenceLevel, EvidenceClaim, SourceKey } from "../types";

/*
 * Decides which DLC a player must own to reach 100%.
 *
 * Steam exposes no public link between an achievement and the DLC it comes
 * from (checked: appdetails, store pages, the store's achievements category,
 * PICS data via Achievement Scouts — none have it; the sites that do,
 * SteamHunters/TSA/Exophase, gate it behind Cloudflare or auth). So:
 *
 * 1. Gate: SteamHunters' curated hasPaidDlc. If it says 100% needs no paid
 *    DLC, nothing is required, full stop. This alone removes the worst false
 *    positives (ACE COMBAT 7's 22 aircraft sets, LEGO Skywalker Saga's 16
 *    character packs, Dark Souls III's expansions, a soundtrack...).
 * 2. Identify: one AI call maps the game's real achievement list onto its
 *    real DLC list (with store descriptions), using curator notes and
 *    forum/guide findings as context. It must answer with DLC appIds from
 *    the list and achievement NUMBERS from the list, so nothing is
 *    fuzzy-matched; any DLC it can't back with at least one real
 *    achievement is dropped.
 *
 * Validated against 20 games with known answers (curator notes +
 * SteamHunters): 20/20, including multi-DLC (Frostpunk, The Division,
 * Little Nightmares), pass-only content (Persona 3 Reload), DLC later folded
 * into the base game (Dying Light) and games needing no DLC at all.
 */

export type DlcForResolution = { appId: number; name: string; description: string };
export type AchievementForResolution = { name: string; description: string | null; unlockPercent: number | null };

export type RequiredDlcResolution = {
  /** Required DLC appId -> names of the achievements that need it. */
  required: Map<number, string[]>;
  claim: EvidenceClaim;
};

const MAX_EVIDENCE = 5;

const mappingSchema = {
  type: Type.OBJECT,
  properties: {
    requiredDlc: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          appId: { type: Type.INTEGER },
          achievements: { type: Type.ARRAY, items: { type: Type.INTEGER } },
          reason: { type: Type.STRING },
        },
        required: ["appId", "achievements", "reason"],
      },
    },
  },
  required: ["requiredDlc"],
};

const mappingZodSchema = z.object({
  requiredDlc: z.array(z.object({ appId: z.number(), achievements: z.array(z.number()), reason: z.string() })),
});

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const GENERIC_TOKENS = new Set(["the", "a", "an", "of", "and", "dlc", "dlcs", "pack", "expansion", "edition", "content"]);
const BASE_GAME_SENTENCE = /\b(now )?(included|bundled|merged) (in|into|with) the base game\b|\bnow part of the base game\b/i;

/**
 * DLC an expert note says are now part of the base game (e.g. "The Following
 * and Bozak Horde DLCs now included in the base game.") — owning the game
 * already covers them, so they're never a requirement. Enforced here rather
 * than left to the prompt: in testing the model applied that rule to one of
 * the two DLC named in the same sentence and not the other.
 */
function dlcIncludedInBaseGame(gameName: string, notes: string[], dlcs: DlcForResolution[]): Set<number> {
  const gameTokens = new Set(tokens(gameName));
  const sentences = notes.flatMap((n) => n.split(/(?<=[.!?])\s+/)).filter((s) => BASE_GAME_SENTENCE.test(s));
  const excluded = new Set<number>();
  for (const sentence of sentences) {
    const words = new Set(tokens(sentence));
    for (const d of dlcs) {
      const distinctive = tokens(d.name).filter((t) => !gameTokens.has(t) && !GENERIC_TOKENS.has(t));
      if (distinctive.length > 0 && distinctive.every((t) => words.has(t))) excluded.add(d.appId);
    }
  }
  return excluded;
}

function result(
  required: Map<number, string[]>,
  confidence: ConfidenceLevel,
  reasoning: string,
  method: string,
  sourceKey: SourceKey = "ai_resolver",
): RequiredDlcResolution {
  return {
    required,
    claim: {
      sourceKey,
      claim: { type: "required_dlc_resolution", method, requiredDlcAppIds: [...required.keys()] },
      confidence,
      reasoning,
      checkedAt: new Date(),
    },
  };
}

/** What other sources said about DLC, as context lines for the mapper. */
function evidenceLines(claims: EvidenceClaim[]): { notes: string[]; findings: string[]; anySignal: boolean } {
  const notes = claims
    .filter((c) => c.claim.type === "curator_note" && typeof c.claim.text === "string")
    .map((c) => String(c.claim.text));
  const findings: string[] = [];
  let anySignal = notes.some((n) => /\b(dlc|expansion|season pass)\b/i.test(n) && !/\bno dlcs? (are )?(required|needed)\b/i.test(n));
  for (const c of claims) {
    const type = c.claim.type;
    if (c.confidence === "low") continue;
    if ((type === "dlc_required_signal" || type === "dlc_required") && c.claim.value === true) {
      anySignal = true;
      if (c.reasoning) findings.push(`${c.sourceKey}: ${c.reasoning}`);
    } else if (type === "dlc_achievement_requirement" && typeof c.claim.name === "string") {
      anySignal = true;
      findings.push(`${c.sourceKey}: "${c.claim.name}" — ${c.reasoning ?? ""}`);
    }
  }
  return { notes, findings: findings.slice(0, 12), anySignal };
}

export async function resolveRequiredDlc(
  gameName: string,
  dlcs: DlcForResolution[],
  achievements: AchievementForResolution[],
  claims: EvidenceClaim[],
  /** This game's last mapped result, reused if the AI call fails, so a
   * transient Gemini error doesn't wipe out a good answer. */
  previous: Map<number, string[]> | null = null,
): Promise<RequiredDlcResolution> {
  const none = new Map<number, string[]>();
  if (dlcs.length === 0) return result(none, "high", "This game has no DLC on Steam.", "no_dlc", "steam_api");

  const paidClaim = claims.find((c) => c.claim.type === "paid_dlc_required" && typeof c.claim.value === "boolean");
  const paid = paidClaim ? (paidClaim.claim.value as boolean) : undefined;
  if (paid === false) {
    return result(none, "high", "SteamHunters' curated data says 100% needs no paid DLC.", "steamhunters_none", "steamhunters");
  }

  const { notes, findings: allFindings, anySignal } = evidenceLines(claims);
  // A human note about DLC beats AI-extracted forum/guide findings, and those
  // findings vary from run to run (they come from other AI calls) — in
  // testing they were what occasionally pulled in a DLC the note had ruled
  // out (Dying Light's Bozak Horde, now part of the base game).
  const notesCoverDlc = notes.some((n) => /\b(dlcs?|expansions?|season pass)\b/i.test(n));
  const findings = notesCoverDlc ? [] : allFindings;
  // Every answer — the AI's or a reused previous one — goes through the same
  // filters: only DLC still in this game's list, minus any the notes say are
  // part of the base game now.
  const includedInBase = dlcIncludedInBaseGame(gameName, notes, dlcs);
  const allowed = new Set(dlcs.filter((d) => !includedInBase.has(d.appId)).map((d) => d.appId));
  const previousAllowed = previous ? new Map([...previous].filter(([appId]) => allowed.has(appId))) : null;
  // Without SteamHunters' answer, only go looking when some source actually
  // says DLC is involved — otherwise a game with plenty of content DLC that
  // adds no achievements would invite the mapper to guess.
  if (paid === undefined && !anySignal) {
    return result(none, "medium", "No source indicates that any DLC is needed for 100%.", "no_evidence");
  }

  const prompt = `You decide which DLC a player must OWN to unlock 100% of the Steam achievements of "${gameName}".

A DLC is required ONLY if at least one achievement below can only be unlocked with content that DLC adds. Rules:
- Cosmetic packs, skins, costumes, outfits, soundtracks, artbooks, wallpapers, supporter or donation packs, boosters, currency, character packs that only add cosmetic or multiplayer characters, and pre-order bonuses are NOT required unless the expert notes explicitly name them.
- If the gating content is sold BOTH individually and inside a season pass, expansion pass or bundle, return the individual DLC(s), never the pass. Return a pass only when that content is not sold separately in the DLC list.
- If the expert notes say a DLC is now included in the base game, it is NOT required.
- "All DLCs required" in an expert note means every DLC that adds achievement content, not cosmetics.
- For every DLC you return, cite 1-5 achievement numbers (the #N in the achievement list) of achievements that need that DLC.
- Only use appIds from the DLC list.
- Achievements are listed in the game's own order; achievements added by a DLC are usually appended as a block, often near the end, and often have a much lower unlock percentage than the base-game ones around them. Hidden achievements have no description: use their names, their position in the list and their unlock percentage to tell which DLC they belong to.
- If the expert notes or SteamHunters say paid DLC is required, find the DLC responsible and cite its achievements even if they are hidden.
- When the expert notes name the required DLC specifically, return exactly those DLC. Add another DLC only if an achievement's own description clearly refers to that DLC's content.
- Cite an achievement for a DLC only when its name or description points to content that DLC adds (its story, characters, locations, modes, items). Generic achievements (kill X enemies, complete Y activities) belong to the base game.

SteamHunters (a curated achievement database) says 100% requires paid DLC: ${paid === true ? "YES" : "unknown"}.

Expert notes (human-written, authoritative):
${notes.length > 0 ? notes.map((n) => `- ${n}`).join("\n") : "- none"}

Other sources (forum posts, guides, Wikipedia, community tags; less reliable):
${findings.length > 0 ? findings.map((f) => `- ${f}`).join("\n") : "- none"}

DLC list (appId: name — store description):
${dlcs.map((d) => `${d.appId}: ${d.name} — ${stripHtml(d.description).slice(0, 300)}`).join("\n")}

Achievement list (#number. name — description [% of players who unlocked it]):
${achievements
  .map(
    (a, i) =>
      `#${i + 1}. ${a.name} — ${a.description || "(hidden, no description)"} [${a.unlockPercent !== null ? `${a.unlockPercent.toFixed(1)}%` : "?"}]`,
  )
  .join("\n")}`;

  // Temperature 0: the same game should get the same answer every run, and
  // sampling noise is exactly what produced loose attributions in testing.
  // Extra retries: this is the one AI call whose failure leaves a verdict
  // provisional, and Gemini's free tier 429s under bursts.
  const text = await generateJson(prompt, mappingSchema, 4, { temperature: 0 });
  let parsed: z.infer<typeof mappingZodSchema> | null = null;
  if (text) {
    try {
      const out = mappingZodSchema.safeParse(JSON.parse(text));
      parsed = out.success ? out.data : null;
    } catch {
      parsed = null;
    }
  }
  if (!parsed) {
    if (previousAllowed && previousAllowed.size > 0) {
      return result(previousAllowed, "medium", "Kept the previous DLC match: the AI mapping step was unavailable.", "previous_result");
    }
    // Couldn't identify which DLC — say nothing specific rather than guess,
    // but at low confidence so the verdict reads as provisional.
    return result(none, paid === true ? "low" : "medium", "Could not determine which DLC the achievements need.", "ai_unavailable");
  }

  const required = new Map<number, string[]>();
  for (const r of parsed.requiredDlc) {
    if (!allowed.has(r.appId)) continue;
    const evidence = [
      ...new Set(r.achievements.filter((n) => Number.isInteger(n) && n >= 1 && n <= achievements.length).map((n) => achievements[n - 1].name)),
    ].slice(0, MAX_EVIDENCE);
    if (evidence.length === 0) continue; // no real achievement backs it
    required.set(r.appId, [...(required.get(r.appId) ?? []), ...evidence].slice(0, MAX_EVIDENCE));
  }

  if (required.size === 0 && paid === true && previousAllowed && previousAllowed.size > 0) {
    return result(previousAllowed, "medium", "Kept the previous DLC match: this run could not identify the DLC.", "previous_result");
  }
  if (required.size === 0 && paid === true) {
    return result(none, "low", "SteamHunters says paid DLC is needed, but the specific DLC could not be identified.", "ai_unmapped");
  }
  return result(
    required,
    paid === true ? "high" : "medium",
    required.size > 0
      ? `Matched achievements to ${required.size} required DLC.`
      : "None of this game's DLC adds achievements.",
    "ai_mapped",
  );
}
