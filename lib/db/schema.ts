import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  numeric,
  timestamp,
  jsonb,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const statusEnum = pgEnum("status", ["green", "red", "yellow"]);
export const confidenceEnum = pgEnum("confidence", ["high", "medium", "low"]);
export const serverStatusEnum = pgEnum("server_status", ["online", "offline", "unknown"]);
export const sourceKeyEnum = pgEnum("source_key", [
  "steam_api",
  "truesteamachievements",
  "achievement_scouts",
  "steamhunters",
  "community",
  "ai_resolver",
  "steam_forums",
  "steam_guides",
  "wikipedia",
]);
// Named "verification_trigger", not "trigger" — that name collides with
// Postgres's reserved pseudo-type for trigger functions and silently
// resolves columns to the wrong type.
export const triggerEnum = pgEnum("verification_trigger", ["initial", "manual", "cron"]);
export const reportTypeEnum = pgEnum("report_type", [
  "confirmation",
  "dispute",
  "bug_report",
  "server_status",
]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "accepted", "rejected"]);

// --- games -------------------------------------------------------------
export const games = pgTable(
  "games",
  {
    id: integer("id").primaryKey(), // Steam AppID, used directly as the natural key
    name: text("name").notNull(),
    headerImageUrl: text("header_image_url"),
    releaseDate: text("release_date"), // Steam gives free-text dates; store as text
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("games_name_idx").on(t.name)],
);

// --- dlc -----------------------------------------------------------------
export const dlc = pgTable(
  "dlc",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    appId: integer("app_id").notNull(), // DLC's own Steam AppID
    name: text("name").notNull(),
    priceCents: integer("price_cents"), // null = free/unknown
    currency: text("currency").default("USD"),
    isDelisted: boolean("is_delisted").notNull().default(false),
    requiredForAchievements: boolean("required_for_achievements").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.gameId, t.appId)],
);

// --- achievements ----------------------------------------------------------
export const achievements = pgTable(
  "achievements",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    apiName: text("api_name").notNull(), // Steam internal achievement id
    displayName: text("display_name").notNull(),
    description: text("description"),
    iconUrl: text("icon_url"),
    hidden: boolean("hidden").notNull().default(false),
    globalUnlockPercent: numeric("global_unlock_percent", { precision: 5, scale: 2 }),
    isMissable: boolean("is_missable").notNull().default(false),
    isBugged: boolean("is_bugged").notNull().default(false),
    requiresMultiplayer: boolean("requires_multiplayer").notNull().default(false),
    requiresDlcId: integer("requires_dlc_id").references(() => dlc.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.gameId, t.apiName)],
);

// --- sources (evidence providers) ------------------------------------------
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  key: sourceKeyEnum("key").notNull().unique(),
  displayName: text("display_name").notNull(),
  baseUrl: text("base_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- evidence ----------------------------------------------------------------
export const evidence = pgTable(
  "evidence",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    achievementId: integer("achievement_id").references(() => achievements.id, {
      onDelete: "cascade",
    }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id),
    claim: jsonb("claim").notNull(), // e.g. {"type":"missable","value":true}
    reasoning: text("reasoning"),
    confidence: confidenceEnum("confidence").notNull(),
    rawUrl: text("raw_url"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("evidence_game_idx").on(t.gameId)],
);

// --- analysis_results (current snapshot, one row per game) ------------------
export const analysisResults = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" })
    .unique(),
  status: statusEnum("status").notNull(),
  confidence: confidenceEnum("confidence").notNull(),
  dlcRequired: jsonb("dlc_required").notNull().default([]), // [{dlcId, name, priceCents}]
  totalDlcCostCents: integer("total_dlc_cost_cents").notNull().default(0),
  multiplayerRequired: boolean("multiplayer_required").notNull().default(false),
  minPlayers: integer("min_players"),
  serversStatus: serverStatusEnum("servers_status").notNull().default("unknown"),
  missableAchievementCount: integer("missable_achievement_count").notNull().default(0),
  buggedAchievementCount: integer("bugged_achievement_count").notNull().default(0),
  unobtainableAchievementCount: integer("unobtainable_achievement_count").notNull().default(0),
  estimatedHours: numeric("estimated_hours", { precision: 6, scale: 1 }),
  reasoning: text("reasoning").notNull(),
  aiUsed: boolean("ai_used").notNull().default(false),
  stale: boolean("stale").notNull().default(false),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- verification_history (append-only pipeline run log) --------------------
export const verificationHistory = pgTable(
  "verification_history",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    snapshot: jsonb("snapshot").notNull(), // full analysis_results-shaped object at that time
    status: statusEnum("status").notNull(),
    trigger: triggerEnum("trigger").notNull(),
    pipelineVersion: text("pipeline_version").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    error: text("error"),
  },
  (t) => [index("verification_history_game_idx").on(t.gameId)],
);

// --- community_reports (layer 5, minimal schema, API only for MVP) ----------
export const communityReports = pgTable("community_reports", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  achievementId: integer("achievement_id").references(() => achievements.id),
  reportType: reportTypeEnum("report_type").notNull(),
  body: text("body").notNull(),
  submittedByEmail: text("submitted_by_email"),
  status: reportStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- relations ---------------------------------------------------------------
export const gamesRelations = relations(games, ({ many, one }) => ({
  achievements: many(achievements),
  dlc: many(dlc),
  evidence: many(evidence),
  analysisResult: one(analysisResults),
  history: many(verificationHistory),
  communityReports: many(communityReports),
}));

export const dlcRelations = relations(dlc, ({ one, many }) => ({
  game: one(games, { fields: [dlc.gameId], references: [games.id] }),
  requiredByAchievements: many(achievements),
}));

export const achievementsRelations = relations(achievements, ({ one, many }) => ({
  game: one(games, { fields: [achievements.gameId], references: [games.id] }),
  requiredDlc: one(dlc, { fields: [achievements.requiresDlcId], references: [dlc.id] }),
  evidence: many(evidence),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  evidence: many(evidence),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  game: one(games, { fields: [evidence.gameId], references: [games.id] }),
  achievement: one(achievements, { fields: [evidence.achievementId], references: [achievements.id] }),
  source: one(sources, { fields: [evidence.sourceId], references: [sources.id] }),
}));

export const analysisResultsRelations = relations(analysisResults, ({ one }) => ({
  game: one(games, { fields: [analysisResults.gameId], references: [games.id] }),
}));

export const verificationHistoryRelations = relations(verificationHistory, ({ one }) => ({
  game: one(games, { fields: [verificationHistory.gameId], references: [games.id] }),
}));

export const communityReportsRelations = relations(communityReports, ({ one }) => ({
  game: one(games, { fields: [communityReports.gameId], references: [games.id] }),
  achievement: one(achievements, {
    fields: [communityReports.achievementId],
    references: [achievements.id],
  }),
}));
