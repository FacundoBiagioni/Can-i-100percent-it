import { generateJson } from "@/lib/ai/gemini";
import type { EvidenceClaim } from "../../types";
import { conflictResolutionSchema, resolutionResponseZodSchema, buildConflictPrompt } from "./prompt";

export type ConflictGroup = { key: string; claims: EvidenceClaim[] };

export type Resolution = {
  key: string;
  resolvedValue: boolean;
  confidence: "high" | "medium" | "low";
  reasoning: string;
};

/**
 * Only called when layer 3 detects disagreeing claims for the same fact key.
 * One call resolves every conflict for this pipeline run — bounds Gemini
 * usage to actual conflicts, not every analysis.
 */
export async function resolveConflicts(gameName: string, conflicts: ConflictGroup[]): Promise<Resolution[]> {
  if (conflicts.length === 0) return [];

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

  const text = await generateJson(prompt, conflictResolutionSchema);
  if (!text) return [];

  try {
    const parsed = resolutionResponseZodSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data.resolutions : [];
  } catch {
    return [];
  }
}
