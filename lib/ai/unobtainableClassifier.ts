import { Type } from "@google/genai";
import { z } from "zod";
import { generateJson } from "./gemini";

export const unobtainableClassificationSchema = {
  type: Type.OBJECT,
  properties: {
    hasUnobtainableSignal: { type: Type.BOOLEAN },
    confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
    reasoning: { type: Type.STRING },
  },
  required: ["hasUnobtainableSignal", "confidence", "reasoning"],
};

const unobtainableClassificationZodSchema = z.object({
  hasUnobtainableSignal: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
});

export type UnobtainableClassification = z.infer<typeof unobtainableClassificationZodSchema>;

/**
 * Shared by every layer-2 source that asks Gemini "does this text say some
 * achievement is permanently unobtainable?" (forums, guides, Wikipedia).
 * `sourceLabel` describes what `content` is (e.g. "Steam Community forum
 * posts", "community-written achievement guides") for the prompt.
 * `closingInstruction` lets each caller phrase its no-signal-found guidance
 * (worded differently per source since the evidentiary bar differs).
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

Decide: is there credible evidence that some CURRENT achievement is now PERMANENTLY unobtainable through normal means? ${closingInstruction}`;

  const text = await generateJson(prompt, unobtainableClassificationSchema);
  if (!text) return null;
  try {
    const parsed = unobtainableClassificationZodSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
