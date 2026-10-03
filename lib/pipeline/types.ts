export type SourceKey =
  | "steam_api"
  | "truesteamachievements"
  | "achievement_scouts"
  | "steamhunters"
  | "community"
  | "ai_resolver"
  | "steam_forums"
  | "steam_guides"
  | "wikipedia";

export type ConfidenceLevel = "high" | "medium" | "low";
export type ServerStatus = "online" | "offline" | "unknown";
export type AnalysisStatus = "green" | "red" | "yellow" | "no_achievements";

export type EvidenceClaim = {
  sourceKey: SourceKey;
  achievementApiName?: string;
  dlcAppId?: number;
  claim: Record<string, unknown>;
  confidence: ConfidenceLevel;
  reasoning?: string;
  rawUrl?: string;
  checkedAt: Date;
};

export type DlcRequirement = {
  dlcAppId: number;
  name: string;
  priceCents: number | null;
  required: boolean;
  isDelisted: boolean;
  /** Achievements that need this DLC (only set on required DLC). */
  evidence?: string[];
};

export type Facts = {
  gameId: number;
  gameName: string;
  foundOnSteam: boolean;
  dlcNeeded: DlcRequirement[];
  multiplayerRequired: boolean;
  minPlayers: number | null;
  serversStatus: ServerStatus;
  missableAchievements: string[]; // apiNames
  buggedAchievements: string[]; // apiNames
  unobtainableAchievements: string[]; // apiNames — confirmed permanently blocked (delisted/discontinued/shutdown), not just reported buggy
  estimatedHours: number | null;
  claims: EvidenceClaim[];
};

export type AnalyzerContext = {
  appId: number;
  gameName: string;
};

export interface Analyzer {
  id: SourceKey;
  /** Never throws — failures degrade to an empty result + low-confidence claim. */
  run(ctx: AnalyzerContext): Promise<Partial<Facts> & { claims: EvidenceClaim[] }>;
}

export type AnalysisResult = {
  gameId: number;
  status: AnalysisStatus;
  confidence: ConfidenceLevel;
  dlcRequired: DlcRequirement[];
  totalDlcCostCents: number;
  multiplayerRequired: boolean;
  minPlayers: number | null;
  serversStatus: ServerStatus;
  missableAchievementCount: number;
  buggedAchievementCount: number;
  unobtainableAchievementCount: number;
  estimatedHours: number | null;
  reasoning: string;
  aiUsed: boolean;
};
