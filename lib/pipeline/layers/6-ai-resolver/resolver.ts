import { GoogleGenAI } from "@google/genai";
import type { EvidenceClaim } from "../../types";
import { conflictResolutionSchema, resolutionResponseZodSchema, buildConflictPrompt } from "./prompt";

export type ConflictGroup = { key: string; claims: EvidenceClaim[] };

export type Resolution = {
  key: string;
  resolvedValue: boolean;
  confidence: "high" | "medium" | "low";
  reasoning: string;
};

const MODEL = "gemini-3.6-flash";

/**
 * Only called when layer 3 detects disagreeing claims for the same fact key.
 * One call resolves every conflict for this pipeline run — bounds Gemini
 * usage to actual conflicts, not every analysis.
 */
export async function resolveConflicts(gameName: string, conflicts: ConflictGroup[]): Promise<Resolution[]> {
  if (conflicts.length === 0) return [];

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = buildConflictPrompt(
      gameName,
      conflicts.map((c) => ({
        key: c.key,
        claims: c.claims.map((cl) => ({
          sourceKey: cl.sourceKey,
          value: cl.claim.value,
          confidence: cl.confidence,
          reasoning: cl.reasoning,
        })),
      })),
    );

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: conflictResolutionSchema,
      },
    });

    const text = response.text;
    if (!text) return [];

    const parsed = resolutionResponseZodSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return [];

    return parsed.data.resolutions;
  } catch {
    // AI resolver is a best-effort tiebreaker — never fail the pipeline over it.
    return [];
  }
}
