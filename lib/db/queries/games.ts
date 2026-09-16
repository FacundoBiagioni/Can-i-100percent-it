import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, dlc } from "@/lib/db/schema";
import { getAppDetails, getDlcDetails } from "@/lib/pipeline/layers/1-steam/client";

export async function getGameWithDlc(appId: number) {
  const game = await db.query.games.findFirst({
    where: eq(games.id, appId),
    with: { dlc: true },
  });
  return game ?? null;
}

/**
 * Returns the game row, fetching from Steam and persisting on first lookup.
 * Returns null if the AppID doesn't exist on Steam at all.
 */
export async function getOrCreateGame(appId: number) {
  const existing = await getGameWithDlc(appId);
  if (existing) return existing;

  const details = await getAppDetails(appId);
  if (!details) return null;

  const dlcDetails = await Promise.all(details.dlcAppIds.map(getDlcDetails));

  await db.insert(games).values({
    id: details.appId,
    name: details.name,
    headerImageUrl: details.headerImage,
    releaseDate: details.releaseDate,
  });

  if (dlcDetails.length > 0) {
    await db.insert(dlc).values(
      dlcDetails.map((d) => ({
        gameId: details.appId,
        appId: d.appId,
        name: d.name,
        priceCents: d.priceCents,
        isDelisted: d.name.startsWith("Unknown DLC"),
      })),
    );
  }

  return getGameWithDlc(appId);
}
