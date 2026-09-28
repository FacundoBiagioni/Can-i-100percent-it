import { getOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { classifyUnobtainableSignal } from "@/lib/ai/unobtainableClassifier";
import type { EvidenceClaim } from "../../types";
import type { ScraperAdapter } from "./types";

// Verified live 2026-09-28 against en.wikipedia.org's public MediaWiki API
// (api.php) — no key, no Cloudflare, standard JSON. Weaker signal than
// forums/guides for granular per-achievement trivia (a game's Wikipedia
// article rarely mentions a specific promo DLC or a single missable
// achievement), but reliably documents big, notable stories — most
// importantly a live-service game's servers shutting down entirely, which
// Wikipedia tends to cover as newsworthy even when Steam's own metadata
// says nothing (confirmed live: Anthem's article states "Anthem's servers
// shut down on January 12, 2026, rendering the game unplayable").
const WIKI_API = "https://en.wikipedia.org/w/api.php";

async function findArticleExtract(gameName: string): Promise<{ title: string; extract: string } | null> {
  const searchUrl = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(`${gameName} video game`)}&format=json&srlimit=1`;
  const searchRes = await fetch(searchUrl, { headers: { "User-Agent": "can-i-100-it/1.0" } });
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const pageId = searchData?.query?.search?.[0]?.pageid;
  if (!pageId) return null;

  const extractUrl = `${WIKI_API}?action=query&prop=extracts&explaintext=1&pageids=${pageId}&format=json`;
  const extractRes = await fetch(extractUrl, { headers: { "User-Agent": "can-i-100-it/1.0" } });
  if (!extractRes.ok) return null;
  const extractData = await extractRes.json();
  const page = extractData?.query?.pages?.[String(pageId)];
  if (!page?.extract) return null;

  return { title: page.title, extract: page.extract };
}

async function fetchArticle(appId: number, gameName: string) {
  return getOrFetch(CacheKeys.scrape("wikipedia", appId), CacheTTL.scrapeSuccess, () =>
    findArticleExtract(gameName),
  );
}

async function classifyArticle(gameName: string, articleTitle: string, extract: string) {
  return classifyUnobtainableSignal(
    gameName,
    `the Wikipedia article "${articleTitle}"`,
    extract,
    "Wikipedia articles rarely discuss individual achievements, so if it only confirms the game is still live/purchasable with no mention of shutdowns or delisting, report hasUnobtainableSignal as false with medium confidence — don't invent a signal that isn't there.",
  );
}

export const wikipediaAdapter: ScraperAdapter = {
  source: "wikipedia",

  async fetchGameData(appId: number, gameName: string): Promise<EvidenceClaim[]> {
    const checkedAt = new Date();

    try {
      const article = await fetchArticle(appId, gameName);
      if (!article) return [];

      const classification = await classifyArticle(gameName, article.title, article.extract);
      if (!classification) return [];

      return [
        {
          sourceKey: "wikipedia",
          claim: { type: "achievement_unobtainable_signal", value: classification.hasUnobtainableSignal },
          confidence: classification.confidence,
          reasoning: classification.reasoning,
          rawUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, "_"))}`,
          checkedAt,
        },
      ];
    } catch {
      return [];
    }
  },
};
