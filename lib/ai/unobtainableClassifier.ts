import { Type } from "@google/genai";
import { z } from "zod";
import { generateJson } from "./gemini";
import type { EvidenceClaim, SourceKey, ConfidenceLevel } from "@/lib/pipeline/types";

export const unobtainableClassificationSchema = {
  type: Type.OBJECT,
  properties: {
    hasUnobtainableSignal: { type: Type.BOOLEAN },
    confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
    reasoning: { type: Type.STRING },
    affectedAchievements: {
      type: Type.ARRAY,
      description:
        "Specific achievement name(s) the text says are unobtainable, if any are named. Empty if the signal is about the game generally (e.g. servers down affecting several unnamed achievements) or if hasUnobtainableSignal is false.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The achievement's name/title as written in the source text" },
          reason: { type: Type.STRING, description: "One sentence on why this specific achievement is unobtainable" },
        },
        required: ["name", "reason"],
      },
    },
    hasMissableSignal: { type: Type.BOOLEAN },
    missableConfidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
    missableReasoning: { type: Type.STRING },
    missableAchievements: {
      type: Type.ARRAY,
      description:
        "Specific achievement name(s) the text says can be permanently locked out on a single save/playthrough (a story choice, branching path, or point-of-no-return) but remain obtainable by starting a new game or separate save. Empty if hasMissableSignal is false or no specific achievement is named.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The achievement's name/title as written in the source text" },
          reason: { type: Type.STRING, description: "One sentence on what choice/action locks it out on that save" },
        },
        required: ["name", "reason"],
      },
    },
    requiresPaidDlc: { type: Type.BOOLEAN },
    dlcConfidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
    dlcReasoning: { type: Type.STRING },
    requiredDlc: {
      type: Type.ARRAY,
      description:
        "Specific paid DLC/expansion name(s) the text says are needed to unlock some achievement(s), if any are named. Empty if requiresPaidDlc is false, or if it's true but no specific DLC is named.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The DLC/expansion's name as written in the source text" },
          reason: { type: Type.STRING, description: "One sentence on which achievement(s) it gates, if stated" },
        },
        required: ["name", "reason"],
      },
    },
  },
  required: [
    "hasUnobtainableSignal",
    "confidence",
    "reasoning",
    "affectedAchievements",
    "hasMissableSignal",
    "missableConfidence",
    "missableReasoning",
    "missableAchievements",
    "requiresPaidDlc",
    "dlcConfidence",
    "dlcReasoning",
    "requiredDlc",
  ],
};

const unobtainableClassificationZodSchema = z.object({
  hasUnobtainableSignal: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
  affectedAchievements: z.array(z.object({ name: z.string(), reason: z.string() })),
  hasMissableSignal: z.boolean(),
  missableConfidence: z.enum(["high", "medium", "low"]),
  missableReasoning: z.string(),
  missableAchievements: z.array(z.object({ name: z.string(), reason: z.string() })),
  requiresPaidDlc: z.boolean(),
  dlcConfidence: z.enum(["high", "medium", "low"]),
  dlcReasoning: z.string(),
  requiredDlc: z.array(z.object({ name: z.string(), reason: z.string() })),
});

export type UnobtainableClassification = z.infer<typeof unobtainableClassificationZodSchema>;

/**
 * Shared by every layer-2 source that asks Gemini to read the same text for
 * three independent signals in one call (forums, guides, Wikipedia): whether
 * any achievement is permanently unobtainable (a real block, even from a
 * fresh save), whether any achievement is merely missable (locked out on one
 * save/playthrough but still earnable via a new one — this must NOT be
 * confused with the first question, and the prompt spells out the
 * distinction explicitly since a source describing a single-save lockout as
 * "permanently locked" reads a lot like unobtainable if you don't ask this
 * separately), and whether 100% requires paid DLC. One combined schema keeps
 * this at one Gemini call per source instead of three. `sourceLabel`
 * describes what `content` is (e.g. "Steam Community forum posts",
 * "community-written achievement guides") for the prompt.
 * `closingInstruction` lets each caller phrase its no-signal-found
 * guidance for the unobtainable question specifically (worded differently
 * per source since the evidentiary bar differs); the DLC question is asked
 * the same way for every source.
 */
export async function classifyUnobtainableSignal(
  gameName: string,
  sourceLabel: string,
  content: string,
  closingInstruction: string,
): Promise<UnobtainableClassification | null> {
  const prompt = `You are checking the CURRENT Steam achievement list for the game "${gameName}" — as it exists today, on its current Steam store page — for achievement hunters trying to reach 100%. Answer three SEPARATE questions below using the source text. Question 1 and question 2 are easy to confuse — read the distinction carefully, since mixing them up produces a badly wrong answer:

QUESTION 1 — UNOBTAINABLE (a real, permanent block that makes 100% impossible for anyone from now on): required DLC/content was delisted from sale, a companion app or connected device/service was discontinued, or online/multiplayer servers were shut down. The key test: would starting a brand-new save file or playthrough TODAY still fail to fix it, because the content/infrastructure itself is gone? If yes, it's unobtainable. This is NOT about achievements that are merely difficult, grindy, or that require a fresh save/playthrough to fix — see question 2 for those.

IMPORTANT: some games were relaunched or replaced by a sequel under the SAME Steam store page/AppID (e.g. Counter-Strike 2 replacing Counter-Strike: Global Offensive at appid 730). If the text describes an OLD achievement list being removed or replaced when this happened, that is NOT evidence that the CURRENT game's CURRENT achievements are unobtainable — the current game has its own, presumably obtainable, achievement list. Only flag a signal if it affects achievements a player can pursue in the game as it exists today.

QUESTION 2 — MISSABLE (not a permanent block, just needs care or a second playthrough): an achievement can become permanently locked out ON ONE SAVE FILE because of a story choice, a branching path, a point of no return, or two mutually-exclusive outcomes — but a player CAN still earn it by starting a new game or using a separate save. This does NOT stop anyone from reaching 100% overall, it just means they may need more than one playthrough or a saved backup before a point of no return. Community posts often describe this using words like "permanently locked" or "no longer obtainable" while talking only about ONE save file — that phrasing does NOT make it question-1 unobtainable; if a fresh save fixes it, it belongs here instead.

QUESTION 3 — DLC: does getting 100% require owning PAID DLC/expansion content beyond the base game — i.e. does at least one achievement only unlock through a specific paid DLC? This is independent of questions 1 and 2; a game can require paid DLC and still have every achievement be fully obtainable. Do NOT count free updates, free bonus content, or in-game purchases as DLC.

Here are ${sourceLabel} for this game:

${content}

For question 1: is there credible evidence that some CURRENT achievement is now PERMANENTLY unobtainable, even from a brand-new save? ${closingInstruction} If the text names specific achievement(s) affected, list them in affectedAchievements with the exact name as written and a one-sentence reason each; leave it empty if no specific achievement is named.

For question 2: is there credible evidence that some CURRENT achievement can be missed on a single save/playthrough but is still obtainable via a new one? If the text names specific achievement(s), list them in missableAchievements with the exact name as written and a one-sentence reason each (what choice or action locks it out); leave it empty if none are named, and report hasMissableSignal as false with medium/high confidence if the text simply doesn't discuss anything like this.

For question 3: if the text names the specific DLC/expansion(s) required, list them in requiredDlc with the exact name as written and a one-sentence reason each; leave it empty if requiresPaidDlc is false or no specific DLC is named.`;

  // Temperature 0: the same text should get the same reading every run.
  const text = await generateJson(prompt, unobtainableClassificationSchema, 2, { temperature: 0 });
  if (!text) return null;
  try {
    const parsed = unobtainableClassificationZodSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Turns a classification into three game-level claims (unobtainable signal,
 * missable signal, DLC-required signal) plus one extra claim per named
 * achievement/DLC under each, if any. Those carry a free-text `name` — not
 * Steam's internal apiName/DLC AppID, since that's not something forum posts
 * or guides ever mention — resolved against the game's own achievement/DLC
 * lists in lib/pipeline/orchestrator.ts, where those lists are actually
 * available.
 */
/** Stands in for a source whose text was found but couldn't be read (no AI
 * quota, Gemini down). The orchestrator swaps it for that source's findings
 * from the last analysis, so a missing reading never erases what was known. */
export function readingUnavailable(sourceKey: SourceKey): EvidenceClaim {
  return { sourceKey, claim: { type: "reading_unavailable" }, confidence: "low", checkedAt: new Date() };
}

export function buildClaimsFromClassification(
  sourceKey: SourceKey,
  classification: UnobtainableClassification,
  rawUrl: string | undefined,
  checkedAt: Date,
): EvidenceClaim[] {
  const confidence: ConfidenceLevel = classification.confidence;
  const claims: EvidenceClaim[] = [
    {
      sourceKey,
      claim: { type: "achievement_unobtainable_signal", value: classification.hasUnobtainableSignal },
      confidence,
      reasoning: classification.reasoning,
      rawUrl,
      checkedAt,
    },
  ];

  for (const affected of classification.affectedAchievements) {
    claims.push({
      sourceKey,
      claim: { type: "achievement_unobtainable", name: affected.name },
      confidence,
      reasoning: affected.reason,
      rawUrl,
      checkedAt,
    });
  }

  const missableConfidence: ConfidenceLevel = classification.missableConfidence;
  claims.push({
    sourceKey,
    claim: { type: "missable_signal", value: classification.hasMissableSignal },
    confidence: missableConfidence,
    reasoning: classification.missableReasoning,
    rawUrl,
    checkedAt,
  });

  for (const missable of classification.missableAchievements) {
    claims.push({
      sourceKey,
      claim: { type: "missable", name: missable.name },
      confidence: missableConfidence,
      reasoning: missable.reason,
      rawUrl,
      checkedAt,
    });
  }

  const dlcConfidence: ConfidenceLevel = classification.dlcConfidence;
  claims.push({
    sourceKey,
    claim: { type: "dlc_required_signal", value: classification.requiresPaidDlc },
    confidence: dlcConfidence,
    reasoning: classification.dlcReasoning,
    rawUrl,
    checkedAt,
  });

  for (const dlc of classification.requiredDlc) {
    claims.push({
      sourceKey,
      claim: { type: "dlc_achievement_requirement", name: dlc.name },
      confidence: dlcConfidence,
      reasoning: dlc.reason,
      rawUrl,
      checkedAt,
    });
  }

  return claims;
}
