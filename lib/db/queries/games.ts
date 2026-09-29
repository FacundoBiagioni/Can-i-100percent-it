import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, dlc, achievements } from "@/lib/db/schema";
import {
  getAppDetails,
  getDlcDetails,
  getAchievementSchema,
  getGlobalAchievementPercentages,
} from "@/lib/pipeline/layers/1-steam/client";

export async function getGameWithDlc(appId: number) {
  const game = await db.query.games.findFirst({
    where: eq(games.id, appId),
    with: { dlc: true },
  });
  return game ?? null;
}

export async function getAchievementsForGame(appId: number) {
  return db.query.achievements.findMany({ where: eq(achievements.gameId, appId) });
}

async function persistAchievements(appId: number) {
  const [achievementSchema, globalPct] = await Promise.all([
    getAchievementSchema(appId),
    getGlobalAchievementPercentages(appId),
  ]);
  if (achievementSchema.length === 0) return;

  await db.insert(achievements).values(
    achievementSchema.map((a) => ({
      gameId: appId,
      apiName: a.name,
      displayName: a.displayName,
      description: a.description,
      iconUrl: a.icon,
      hidden: a.hidden,
      globalUnlockPercent: globalPct[a.name]?.toFixed(2),
    })),
  ).onConflictDoNothing();
}

/**
 * Returns the game row, fetching from Steam and persisting on first lookup.
 * Returns null if the AppID doesn't exist on Steam at all.
 */
export async function getOrCreateGame(appId: number) {
  const existing = await getGameWithDlc(appId);
  if (existing) {
    // Backfills games created before achievement persistence existed —
    // self-heals on next visit instead of needing a one-off migration.
    const achievementCount = await db.$count(achievements, eq(achievements.gameId, appId));
    if (achievementCount === 0) await persistAchievements(appId);
    return existing;
  }

  const details = await getAppDetails(appId);
  if (!details) return null;

  const dlcDetails = await Promise.all(details.dlcAppIds.map(getDlcDetails));

  // onConflictDoNothing: two requests can both see "not found" and race to
  // insert the same game (e.g. quick double-navigation, prefetch + click) —
  // whichever loses just no-ops instead of throwing on the PK/unique
  // constraint, and the final read below returns the winner's row either way.
  await db.insert(games).values({
    id: details.appId,
    name: details.name,
    headerImageUrl: details.headerImage,
    releaseDate: details.releaseDate,
  }).onConflictDoNothing();

  if (dlcDetails.length > 0) {
    await db.insert(dlc).values(
      dlcDetails.map((d) => ({
        gameId: details.appId,
        appId: d.appId,
        name: d.name,
        priceCents: d.priceCents,
        isDelisted: d.name.startsWith("Unknown DLC"),
      })),
    ).onConflictDoNothing();
  }

  await persistAchievements(appId);

  return getGameWithDlc(appId);
}
