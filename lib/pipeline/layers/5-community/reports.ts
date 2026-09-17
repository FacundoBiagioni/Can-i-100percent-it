import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { communityReports } from "@/lib/db/schema";
import type { EvidenceClaim } from "../../types";

/**
 * MVP has no moderation UI yet — reports default to "pending" via
 * POST /api/community-reports and only reach the pipeline once a "accepted"
 * status is set directly in the DB. Free-text reports aren't parsed into
 * structured facts (no NLP); they surface as generic evidence for the
 * result page and for a human reviewer, not as inputs to deriveStatus.
 */
export async function fetchAcceptedCommunityClaims(gameId: number): Promise<EvidenceClaim[]> {
  const rows = await db.query.communityReports.findMany({
    where: and(eq(communityReports.gameId, gameId), eq(communityReports.status, "accepted")),
  });

  return rows.map((r) => ({
    sourceKey: "community" as const,
    achievementApiName: undefined,
    claim: { type: "community_report", reportType: r.reportType, body: r.body },
    confidence: "medium" as const,
    checkedAt: r.createdAt,
  }));
}
