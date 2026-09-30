import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { sources, evidence, achievements } from "@/lib/db/schema";
import type { EvidenceClaim } from "@/lib/pipeline/types";

let sourceIdCache: Map<string, number> | null = null;

async function getSourceIdMap(): Promise<Map<string, number>> {
  if (sourceIdCache) return sourceIdCache;
  const rows = await db.select({ id: sources.id, key: sources.key }).from(sources);
  sourceIdCache = new Map(rows.map((r) => [r.key, r.id]));
  return sourceIdCache;
}

/**
 * `evidence` reflects the CURRENT analysis only — replaced on every pipeline
 * run. The historical record lives in `verification_history.snapshot`.
 */
export async function insertEvidence(gameId: number, claims: EvidenceClaim[]) {
  await db.delete(evidence).where(eq(evidence.gameId, gameId));
  if (claims.length === 0) return;
  const sourceIds = await getSourceIdMap();

  const apiNames = [...new Set(claims.map((c) => c.achievementApiName).filter((n): n is string => !!n))];
  const achievementIdByApiName = new Map<string, number>();
  if (apiNames.length > 0) {
    const rows = await db.query.achievements.findMany({
      where: and(eq(achievements.gameId, gameId)),
      columns: { id: true, apiName: true },
    });
    for (const r of rows) {
      if (apiNames.includes(r.apiName)) achievementIdByApiName.set(r.apiName, r.id);
    }
  }

  const rows = claims
    .map((c) => {
      const sourceId = sourceIds.get(c.sourceKey);
      if (!sourceId) return null; // unknown source key — skip rather than fail the whole batch
      return {
        gameId,
        sourceId,
        achievementId: c.achievementApiName ? (achievementIdByApiName.get(c.achievementApiName) ?? null) : null,
        claim: c.claim,
        reasoning: c.reasoning,
        confidence: c.confidence,
        rawUrl: c.rawUrl,
        checkedAt: c.checkedAt,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length > 0) await db.insert(evidence).values(rows);
}
