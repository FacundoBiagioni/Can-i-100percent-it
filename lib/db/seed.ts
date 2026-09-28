import { db } from "./index";
import { sources } from "./schema";

const SOURCES: { key: (typeof sources.$inferInsert)["key"]; displayName: string; baseUrl: string | null }[] = [
  { key: "steam_api", displayName: "Steam Web API", baseUrl: "https://api.steampowered.com" },
  { key: "truesteamachievements", displayName: "TrueSteamAchievements", baseUrl: "https://truesteamachievements.com" },
  { key: "achievement_scouts", displayName: "Achievement Scouts", baseUrl: "https://achievement-scouts.com" },
  { key: "steamhunters", displayName: "Steam Hunters", baseUrl: "https://steamhunters.com" },
  { key: "community", displayName: "Community reports", baseUrl: null },
  { key: "ai_resolver", displayName: "AI conflict resolver", baseUrl: null },
  { key: "steam_forums", displayName: "Steam Community Discussions", baseUrl: "https://steamcommunity.com" },
];

async function seed() {
  await db.insert(sources).values(SOURCES).onConflictDoNothing();
  console.log(`Seeded ${SOURCES.length} sources.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
