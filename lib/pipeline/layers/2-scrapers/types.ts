import type { EvidenceClaim, SourceKey } from "../../types";

export interface ScraperAdapter {
  source: SourceKey;
  /** Never throws — a failing/blocked source returns []. */
  fetchGameData(appId: number, gameName: string): Promise<EvidenceClaim[]>;
}
