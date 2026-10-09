import { eq, and, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { achievements, evidence, sources } from "@/lib/db/schema";

const FLAGGED_CLAIM_TYPES = ["missable", "bugged", "achievement_unobtainable"];

export type FlaggedAchievement = {
  id: number;
  apiName: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  /** Steam marks it hidden (a spoiler until unlocked). */
  hidden: boolean;
  /** "upcoming": unobtainable only because its content isn't in the game yet. */
  flags: ("missable" | "bugged" | "unobtainable" | "upcoming")[];
  reasons: { sourceName: string; reasoning: string | null; rawUrl: string | null }[];
};

/** Achievements this game's evidence flagged as missable, bugged, or confirmed unobtainable — with why. */
export async function getFlaggedAchievements(gameId: number): Promise<FlaggedAchievement[]> {
  const rows = await db
    .select({
      achievementId: achievements.id,
      apiName: achievements.apiName,
      displayName: achievements.displayName,
      description: achievements.description,
      iconUrl: achievements.iconUrl,
      hidden: achievements.hidden,
      claimType: evidence.claim,
      reasoning: evidence.reasoning,
      rawUrl: evidence.rawUrl,
      sourceName: sources.displayName,
    })
    .from(evidence)
    .innerJoin(achievements, eq(evidence.achievementId, achievements.id))
    .innerJoin(sources, eq(evidence.sourceId, sources.id))
    .where(and(eq(evidence.gameId, gameId), isNotNull(evidence.achievementId)));

  const byAchievement = new Map<number, FlaggedAchievement>();

  for (const row of rows) {
    const type = typeof row.claimType === "object" && row.claimType !== null ? (row.claimType as { type?: unknown }).type : undefined;
    if (typeof type !== "string" || !FLAGGED_CLAIM_TYPES.includes(type)) continue;
    const upcoming = (row.claimType as { upcoming?: unknown }).upcoming === true;
    const flag = type === "achievement_unobtainable" ? (upcoming ? "upcoming" : "unobtainable") : (type as "missable" | "bugged");

    const existing = byAchievement.get(row.achievementId);
    const reason = { sourceName: row.sourceName, reasoning: row.reasoning, rawUrl: row.rawUrl };
    if (existing) {
      if (!existing.flags.includes(flag)) existing.flags.push(flag);
      existing.reasons.push(reason);
    } else {
      byAchievement.set(row.achievementId, {
        id: row.achievementId,
        apiName: row.apiName,
        displayName: row.displayName,
        description: row.description,
        iconUrl: row.iconUrl,
        hidden: row.hidden,
        flags: [flag],
        reasons: [reason],
      });
    }
  }

  return [...byAchievement.values()];
}

/** Display names of a game's achievements Steam marks hidden (spoilers until
 * unlocked), so they can be covered wherever a name shows up in text. */
export async function getHiddenAchievementNames(gameId: number): Promise<string[]> {
  const rows = await db
    .select({ name: achievements.displayName })
    .from(achievements)
    .where(and(eq(achievements.gameId, gameId), eq(achievements.hidden, true)));
  return rows.map((r) => r.name);
}
