CREATE TYPE "public"."confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('confirmation', 'dispute', 'bug_report', 'server_status');--> statement-breakpoint
CREATE TYPE "public"."server_status" AS ENUM('online', 'offline', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."source_key" AS ENUM('steam_api', 'truesteamachievements', 'achievement_scouts', 'steamhunters', 'community', 'ai_resolver');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('green', 'red', 'yellow');--> statement-breakpoint
CREATE TYPE "public"."trigger" AS ENUM('initial', 'manual', 'cron');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"api_name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"icon_url" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"global_unlock_percent" numeric(5, 2),
	"is_missable" boolean DEFAULT false NOT NULL,
	"is_bugged" boolean DEFAULT false NOT NULL,
	"requires_multiplayer" boolean DEFAULT false NOT NULL,
	"requires_dlc_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_game_id_api_name_unique" UNIQUE("game_id","api_name")
);
--> statement-breakpoint
CREATE TABLE "analysis_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"status" "status" NOT NULL,
	"confidence" "confidence" NOT NULL,
	"dlc_required" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_dlc_cost_cents" integer DEFAULT 0 NOT NULL,
	"multiplayer_required" boolean DEFAULT false NOT NULL,
	"min_players" integer,
	"servers_status" "server_status" DEFAULT 'unknown' NOT NULL,
	"missable_achievement_count" integer DEFAULT 0 NOT NULL,
	"bugged_achievement_count" integer DEFAULT 0 NOT NULL,
	"estimated_hours" numeric(6, 1),
	"reasoning" text NOT NULL,
	"ai_used" boolean DEFAULT false NOT NULL,
	"stale" boolean DEFAULT false NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_results_game_id_unique" UNIQUE("game_id")
);
--> statement-breakpoint
CREATE TABLE "community_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"achievement_id" integer,
	"report_type" "report_type" NOT NULL,
	"body" text NOT NULL,
	"submitted_by_email" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dlc" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"app_id" integer NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer,
	"currency" text DEFAULT 'USD',
	"is_delisted" boolean DEFAULT false NOT NULL,
	"required_for_achievements" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dlc_game_id_app_id_unique" UNIQUE("game_id","app_id")
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"achievement_id" integer,
	"source_id" integer NOT NULL,
	"claim" jsonb NOT NULL,
	"reasoning" text,
	"confidence" "confidence" NOT NULL,
	"raw_url" text,
	"checked_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"header_image_url" text,
	"release_date" text,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" "source_key" NOT NULL,
	"display_name" text NOT NULL,
	"base_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "verification_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"status" "status" NOT NULL,
	"trigger" "trigger" NOT NULL,
	"pipeline_version" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_requires_dlc_id_dlc_id_fk" FOREIGN KEY ("requires_dlc_id") REFERENCES "public"."dlc"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dlc" ADD CONSTRAINT "dlc_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_history" ADD CONSTRAINT "verification_history_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidence_game_idx" ON "evidence" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "games_name_idx" ON "games" USING btree ("name");--> statement-breakpoint
CREATE INDEX "verification_history_game_idx" ON "verification_history" USING btree ("game_id");