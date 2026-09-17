import { Type, type Schema } from "@google/genai";
import { z } from "zod";

export const conflictResolutionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    resolutions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          resolvedValue: { type: Type.BOOLEAN },
          confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
          reasoning: { type: Type.STRING },
        },
        required: ["key", "resolvedValue", "confidence", "reasoning"],
      },
    },
  },
  required: ["resolutions"],
};

export const resolutionResponseZodSchema = z.object({
  resolutions: z.array(
    z.object({
      key: z.string(),
      resolvedValue: z.boolean(),
      confidence: z.enum(["high", "medium", "low"]),
      reasoning: z.string(),
    }),
  ),
});

export function buildConflictPrompt(
  gameName: string,
  conflicts: { key: string; claims: { sourceKey: string; value: unknown; confidence: string; reasoning?: string }[] }[],
): string {
  const lines = conflicts.map((c) => {
    const claimLines = c.claims
      .map((cl) => `    - source=${cl.sourceKey} value=${JSON.stringify(cl.value)} confidence=${cl.confidence}${cl.reasoning ? ` reasoning="${cl.reasoning}"` : ""}`)
      .join("\n");
    return `  key="${c.key}":\n${claimLines}`;
  });

  return `You are resolving conflicting evidence about the Steam game "${gameName}" for an achievement-completion checker. Multiple sources disagree on the following boolean facts:

${lines.join("\n\n")}

For each key, decide the most likely correct boolean value given the sources and their confidence levels, and explain your reasoning in one sentence. If you are not confident, say so and set confidence to "low" rather than guessing.`;
}
