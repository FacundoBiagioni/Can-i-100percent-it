CREATE TABLE "dlc_mappings" (
	"game_id" integer PRIMARY KEY NOT NULL,
	"dlc_required" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"method" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dlc_mappings" ADD CONSTRAINT "dlc_mappings_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;