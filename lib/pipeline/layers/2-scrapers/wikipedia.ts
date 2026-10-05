import { getOrFetchWithTtl } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { classifyUnobtainableSignal, buildClaimsFromClassification, readingUnavailable } from "@/lib/ai/unobtainableClassifier";
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

type ArticleResult = { article: { title: string; extract: string } | null; failed: boolean };

async function findArticleExtract(gameName: string): Promise<ArticleResult> {
  const searchUrl = `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(`${gameName} video game`)}&format=json&srlimit=1`;
  const searchRes = await fetch(searchUrl, { headers: { "User-Agent": "can-i-100-it/1.0" } });
  if (!searchRes.ok) return { article: null, failed: true };
  const searchData = await searchRes.json();
  const pageId = searchData?.query?.search?.[0]?.pageid;
  if (!pageId) return { article: null, failed: false }; // genuinely no matching article

  const extractUrl = `${WIKI_API}?action=query&prop=extracts&explaintext=1&pageids=${pageId}&format=json`;
  const extractRes = await fetch(extractUrl, { headers: { "User-Agent": "can-i-100-it/1.0" } });
  if (!extractRes.ok) return { article: null, failed: true };
  const extractData = await extractRes.json();
  const page = extractData?.query?.pages?.[String(pageId)];
  if (!page?.extract) return { article: null, failed: true }; // found the page but extraction broke — suspicious

  return { article: { title: page.title, extract: page.extract }, failed: false };
}

async function fetchArticle(appId: number, gameName: string) {
  const result = await getOrFetchWithTtl(
    CacheKeys.scrape("wikipedia", appId),
    () => findArticleExtract(gameName),
    (r) => (r.article === null && r.failed ? CacheTTL.scrapeFailure : CacheTTL.scrapeSuccess),
  );
  return result.article;
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
      if (!classification) return [readingUnavailable("wikipedia")];

      const rawUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, "_"))}`;
      return buildClaimsFromClassification("wikipedia", classification, rawUrl, checkedAt);
    } catch {
      return [];
    }
  },
};
