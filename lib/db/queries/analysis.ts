import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { analysisResults, verificationHistory, games } from "@/lib/db/schema";
import type { AnalysisResult } from "@/lib/pipeline/types";

const dlcRequiredRowSchema = z.array(
  z.object({
    dlcAppId: z.number(),
    name: z.string(),
    priceCents: z.number().nullable(),
    required: z.boolean(),
    isDelisted: z.boolean(),
    evidence: z.array(z.string()).optional(),
  }),
);

export async function getAnalysisResult(gameId: number): Promise<AnalysisResult | null> {
  const row = await db.query.analysisResults.findFirst({ where: eq(analysisResults.gameId, gameId) });
  if (!row) return null;

  const dlcRequired = dlcRequiredRowSchema.safeParse(row.dlcRequired);

  return {
    gameId: row.gameId,
    status: row.status,
    confidence: row.confidence,
    dlcRequired: dlcRequired.success ? dlcRequired.data : [],
    totalDlcCostCents: row.totalDlcCostCents,
    multiplayerRequired: row.multiplayerRequired,
    minPlayers: row.minPlayers,
    serversStatus: row.serversStatus,
    missableAchievementCount: row.missableAchievementCount,
    buggedAchievementCount: row.buggedAchievementCount,
    unobtainableAchievementCount: row.unobtainableAchievementCount,
    estimatedHours: row.estimatedHours !== null ? Number(row.estimatedHours) : null,
    reasoning: row.reasoning,
    aiUsed: row.aiUsed,
  };
}

/** Required DLC (with the achievements each one unlocks) for every stored
 * game in `gameIds` that has any. Games never analyzed are simply absent. */
export async function getRequiredDlcByGame(gameIds: number[]): Promise<Map<number, AnalysisResult["dlcRequired"]>> {
  const out = new Map<number, AnalysisResult["dlcRequired"]>();
  if (gameIds.length === 0) return out;
  const rows = await db
    .select({ gameId: analysisResults.gameId, dlcRequired: analysisResults.dlcRequired })
    .from(analysisResults)
    .where(inArray(analysisResults.gameId, gameIds));
  for (const row of rows) {
    const parsed = dlcRequiredRowSchema.safeParse(row.dlcRequired);
    if (parsed.success && parsed.data.length > 0) out.set(row.gameId, parsed.data);
  }
  return out;
}

export async function upsertAnalysisResult(result: AnalysisResult) {
  const estimatedHours = result.estimatedHours !== null ? result.estimatedHours.toFixed(1) : null;

  await db
    .insert(analysisResults)
    .values({
      gameId: result.gameId,
      status: result.status,
      confidence: result.confidence,
      dlcRequired: result.dlcRequired,
      totalDlcCostCents: result.totalDlcCostCents,
      multiplayerRequired: result.multiplayerRequired,
      minPlayers: result.minPlayers,
      serversStatus: result.serversStatus,
      missableAchievementCount: result.missableAchievementCount,
      buggedAchievementCount: result.buggedAchievementCount,
      unobtainableAchievementCount: result.unobtainableAchievementCount,
      estimatedHours,
      reasoning: result.reasoning,
      aiUsed: result.aiUsed,
      stale: false,
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: analysisResults.gameId,
      set: {
        status: result.status,
        confidence: result.confidence,
        dlcRequired: result.dlcRequired,
        totalDlcCostCents: result.totalDlcCostCents,
        multiplayerRequired: result.multiplayerRequired,
        minPlayers: result.minPlayers,
        serversStatus: result.serversStatus,
        missableAchievementCount: result.missableAchievementCount,
        buggedAchievementCount: result.buggedAchievementCount,
        unobtainableAchievementCount: result.unobtainableAchievementCount,
        estimatedHours,
        reasoning: result.reasoning,
        aiUsed: result.aiUsed,
        stale: false,
        computedAt: new Date(),
      },
    });

  await db.update(games).set({ lastCheckedAt: new Date() }).where(eq(games.id, result.gameId));
}

export async function insertVerificationHistory(
  gameId: number,
  result: AnalysisResult,
  trigger: "initial" | "manual" | "cron",
  pipelineVersion: string,
  startedAt: Date,
) {
  await db.insert(verificationHistory).values({
    gameId,
    snapshot: result,
    status: result.status,
    trigger,
    pipelineVersion,
    startedAt,
    finishedAt: new Date(),
  });
}
