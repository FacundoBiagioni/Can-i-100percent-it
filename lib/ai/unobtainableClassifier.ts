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
  requiresPaidDlc: z.boolean(),
  dlcConfidence: z.enum(["high", "medium", "low"]),
  dlcReasoning: z.string(),
  requiredDlc: z.array(z.object({ name: z.string(), reason: z.string() })),
});

export type UnobtainableClassification = z.infer<typeof unobtainableClassificationZodSchema>;

/**
 * Shared by every layer-2 source that asks Gemini to read the same text for
 * two independent signals in one call (forums, guides, Wikipedia): whether
 * any achievement is permanently unobtainable, and whether 100% requires
 * paid DLC. One combined schema keeps this at one Gemini call per source
 * instead of two. `sourceLabel` describes what `content` is (e.g. "Steam
 * Community forum posts", "community-written achievement guides") for the
 * prompt. `closingInstruction` lets each caller phrase its no-signal-found
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
  const prompt = `You are checking whether the CURRENT Steam achievement list for the game "${gameName}" — as it exists today, on its current Steam store page — has any achievements that are permanently unobtainable. Valid reasons: required DLC/content was delisted, a companion app was discontinued, or online/multiplayer servers were shut down. This is NOT about achievements that are merely difficult, missable-but-still-possible, or grindy.

IMPORTANT: some games were relaunched or replaced by a sequel under the SAME Steam store page/AppID (e.g. Counter-Strike 2 replacing Counter-Strike: Global Offensive at appid 730). If the text describes an OLD achievement list being removed or replaced when this happened, that is NOT evidence that the CURRENT game's CURRENT achievements are unobtainable — the current game has its own, presumably obtainable, achievement list. Only flag a signal if it affects achievements a player can pursue in the game as it exists today.

Here are ${sourceLabel} for this game:

${content}

Decide: is there credible evidence that some CURRENT achievement is now PERMANENTLY unobtainable through normal means? ${closingInstruction} If the text names specific achievement(s) affected, list them in affectedAchievements with the exact name as written and a one-sentence reason each; leave it empty if no specific achievement is named.

Separately, decide: does getting 100% of achievements require owning PAID DLC/expansion content beyond the base game — i.e. does at least one achievement only unlock through a specific paid DLC? This is independent of the unobtainable question above; a game can require paid DLC and still have every achievement be fully obtainable. Do NOT count free updates, free bonus content, or in-game purchases as DLC. If the text names the specific DLC/expansion(s), list them in requiredDlc with the exact name as written and a one-sentence reason each; leave it empty if requiresPaidDlc is false or no specific DLC is named.`;

  const text = await generateJson(prompt, unobtainableClassificationSchema);
  if (!text) return null;
  try {
    const parsed = unobtainableClassificationZodSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Turns a classification into two game-level claims (unobtainable signal,
 * DLC-required signal) plus one extra claim per named achievement and per
 * named DLC, if any. Those carry a free-text `name` — not Steam's internal
 * apiName/DLC AppID, since that's not something forum posts or guides ever
 * mention — resolved against the game's own achievement/DLC lists in
 * lib/pipeline/orchestrator.ts, where those lists are actually available.
 */
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
