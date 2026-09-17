import { or, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";

const STALE_AFTER_DAYS = 7;
const BATCH_SIZE = 10;

/** Games never checked, or last checked more than STALE_AFTER_DAYS ago. */
export async function selectStaleGames(): Promise<number[]> {
  const rows = await db
    .select({ id: games.id })
    .from(games)
    .where(
      or(
        isNull(games.lastCheckedAt),
        lt(games.lastCheckedAt, sql`now() - interval '${sql.raw(String(STALE_AFTER_DAYS))} days'`),
      ),
    )
    .orderBy(sql`${games.lastCheckedAt} asc nulls first`)
    .limit(BATCH_SIZE);

  return rows.map((r) => r.id);
}
