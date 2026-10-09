import { and, asc, desc, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { analysisResults, games } from "@/lib/db/schema";
import { getAppStats } from "@/lib/steamhunters/stats";
import type { AnalysisStatus } from "@/lib/pipeline/types";

/** URL slugs, in the order the index shows them. */
export const LIST_SLUGS = ["impossible-100", "easy-100", "hardest-100", "needs-paid-dlc", "needs-multiplayer"] as const;
export type ListSlug = (typeof LIST_SLUGS)[number];
export const isListSlug = (s: string): s is ListSlug => (LIST_SLUGS as readonly string[]).includes(s);

/** What a list entry shows under the game's name, besides its verdict. */
export type ListDetail =
  | { kind: "unobtainable"; count: number }
  | { kind: "unlistedDlc" }
  | { kind: "hours"; hours: number }
  | { kind: "perfectRate"; percent: number; started: number }
  | { kind: "dlc"; count: number }
  | { kind: "servers"; status: "online" | "offline" | "unknown" };

export type ListEntry = {
  appId: number;
  name: string;
  image: string | null;
  status: AnalysisStatus;
  detail: ListDetail;
};

const EASY_MAX_HOURS = 10;
// Below this many hunters a low completion rate says little: a game three
// people tried isn't "hard".
const HARDEST_MIN_STARTED = 500;
// Nobody at 100% usually means new achievements just landed (or the game
// just came out), not that it's hard. A handful must have done it.
const HARDEST_MIN_PERFECTED = 5;
const HARDEST_SIZE = 50;

const columns = {
  appId: games.id,
  name: games.name,
  image: games.headerImageUrl,
  status: analysisResults.status,
  unobtainable: analysisResults.unobtainableAchievementCount,
  hours: analysisResults.estimatedHours,
  dlcRequired: analysisResults.dlcRequired,
  servers: analysisResults.serversStatus,
};
const base = () => db.select(columns).from(analysisResults).innerJoin(games, eq(games.id, analysisResults.gameId));
type Row = Awaited<ReturnType<typeof base>>[number];

const entry = (r: Row, detail: ListDetail): ListEntry => ({
  appId: r.appId,
  name: r.name,
  image: r.image,
  status: r.status,
  detail,
});

/** Every game in a list, from the verdicts already stored (nothing here
 * starts an analysis). Lists grow as more games get analyzed. */
export async function getList(slug: ListSlug): Promise<ListEntry[]> {
  switch (slug) {
    case "impossible-100": {
      const rows = await base()
        .where(eq(analysisResults.status, "red"))
        .orderBy(desc(analysisResults.unobtainableAchievementCount), asc(games.name));
      // Red with nothing unobtainable: the DLC it needs isn't sold anymore.
      return rows.map((r) =>
        entry(r, r.unobtainable > 0 ? { kind: "unobtainable", count: r.unobtainable } : { kind: "unlistedDlc" }),
      );
    }
    case "easy-100": {
      // Easy means alone and in one sitting or a few: no co-op partners needed.
      const rows = await base()
        .where(
          and(
            eq(analysisResults.status, "green"),
            isNotNull(analysisResults.estimatedHours),
            lt(analysisResults.estimatedHours, String(EASY_MAX_HOURS)),
            eq(analysisResults.multiplayerRequired, false),
          ),
        )
        .orderBy(asc(analysisResults.estimatedHours), asc(games.name));
      return rows.map((r) => entry(r, { kind: "hours", hours: Number(r.hours) }));
    }
    case "needs-paid-dlc": {
      const rows = await base()
        .where(and(sql`jsonb_array_length(${analysisResults.dlcRequired}) > 0`, inArray(analysisResults.status, ["green", "yellow", "red"])))
        .orderBy(desc(sql`jsonb_array_length(${analysisResults.dlcRequired})`), asc(games.name));
      return rows.map((r) => entry(r, { kind: "dlc", count: (r.dlcRequired as unknown[]).length }));
    }
    case "needs-multiplayer": {
      const rows = await base()
        .where(eq(analysisResults.multiplayerRequired, true))
        .orderBy(asc(games.name));
      return rows.map((r) => entry(r, { kind: "servers", status: r.servers }));
    }
    case "hardest-100": {
      // Hard, not impossible: red games have their own list.
      const rows = await base().where(inArray(analysisResults.status, ["green", "yellow"]));
      const stats = await getAppStats(rows.map((r) => r.appId));
      return rows
        .flatMap((r) => {
          const s = stats.get(r.appId);
          if (!s || s.started < HARDEST_MIN_STARTED || s.perfected < HARDEST_MIN_PERFECTED) return [];
          return [{ r, rate: s.perfected / s.started, started: s.started }];
        })
        .sort((a, b) => a.rate - b.rate)
        .slice(0, HARDEST_SIZE)
        .map(({ r, rate, started }) => entry(r, { kind: "perfectRate", percent: rate * 100, started }));
    }
  }
}

/** Lists shorter than this stay out of search engines until they fill up. */
export const MIN_INDEXABLE = 5;

/** How many games each list has right now, for the index page. */
export async function getListCounts(): Promise<Record<ListSlug, number>> {
  const lists = await Promise.all(LIST_SLUGS.map(async (slug) => [slug, (await getList(slug)).length] as const));
  return Object.fromEntries(lists) as Record<ListSlug, number>;
}
