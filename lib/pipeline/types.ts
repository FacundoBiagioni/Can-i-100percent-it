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
export type AnalysisStatus = "green" | "red" | "yellow";

export type EvidenceClaim = {
  sourceKey: SourceKey;
  achievementApiName?: string;
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
  estimatedHours: number | null;
  reasoning: string;
  aiUsed: boolean;
};
