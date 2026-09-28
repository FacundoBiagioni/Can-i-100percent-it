import { load } from "cheerio";
import { Type } from "@google/genai";
import { z } from "zod";
import { getOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { generateJson } from "@/lib/ai/gemini";
import type { EvidenceClaim } from "../../types";
import type { ScraperAdapter } from "./types";

// Verified live 2026-09-28 against steamcommunity.com/app/:id/discussions/search —
// first-party Steam, server-rendered HTML, no Cloudflare challenge.
// "servers shut down" / "discontinued" added after testing found the first
// 3 queries alone missed companion-app-discontinued cases (e.g. Watch_Dogs'
// ctOS Mobile app) that a differently-worded query does surface.
const SEARCH_QUERIES = ["unobtainable", "achievement bugged", "servers shut down", "discontinued"];
const MAX_POSTS_PER_QUERY = 8;

type ForumPost = { title: string; excerpt: string; url: string; timestampMs: number | null };

async function searchDiscussions(appId: number, query: string): Promise<ForumPost[]> {
  const url = `https://steamcommunity.com/app/${appId}/discussions/search/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const $ = load(await res.text());
  const posts: ForumPost[] = [];

  $(".post_searchresult").each((_, el) => {
    if (posts.length >= MAX_POSTS_PER_QUERY) return;
    const container = $(el);
    const href = container.find(".forum_topic_overlay").attr("href");
    if (!href) return;

    const title = container.find(".forum_topic_name").text().trim().replace(/\s+/g, " ");
    const excerpt = container.find(".forum_searchresult_reply_inner").text().trim().replace(/\s+/g, " ");
    const ts = container.find(".searchresult_timestamp").attr("data-timestamp");

    posts.push({
      title,
      excerpt,
      url: href,
      timestampMs: ts ? Number(ts) * 1000 : null,
    });
  });

  return posts;
}

async function fetchForumPosts(appId: number): Promise<ForumPost[]> {
  return getOrFetch(CacheKeys.scrape("steam_forums", appId), CacheTTL.scrapeSuccess, async () => {
    const results = await Promise.all(SEARCH_QUERIES.map((q) => searchDiscussions(appId, q)));
    const seen = new Set<string>();
    const merged: ForumPost[] = [];
    for (const post of results.flat()) {
      if (seen.has(post.url)) continue;
      seen.add(post.url);
      merged.push(post);
    }
    return merged;
  });
}

const classificationSchema = {
  type: Type.OBJECT,
  properties: {
    hasUnobtainableSignal: { type: Type.BOOLEAN },
    confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
    reasoning: { type: Type.STRING },
  },
  required: ["hasUnobtainableSignal", "confidence", "reasoning"],
};

const classificationZodSchema = z.object({
  hasUnobtainableSignal: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
});

async function classifyPosts(gameName: string, posts: ForumPost[]) {
  if (posts.length === 0) return null;

  const postLines = posts
    .map((p, i) => `${i + 1}. "${p.title}" — "${p.excerpt}"${p.timestampMs ? ` (posted ${new Date(p.timestampMs).toISOString().slice(0, 10)})` : ""}`)
    .join("\n");

  const prompt = `You are checking whether the Steam game "${gameName}" has any achievements that are permanently unobtainable — for example because required DLC/content was delisted, a companion app or online feature was discontinued, or multiplayer servers were shut down. This is NOT about achievements that are merely difficult, missable-but-still-possible, or grindy.

Here are Steam Community forum posts that matched a search for complaints about unobtainable/impossible/bugged achievements for this game:

${postLines}

Decide: do these posts provide credible evidence that some achievement is now PERMANENTLY unobtainable through normal means? Ignore posts that are about difficulty, skill issues, or bugs that were later patched (check dates — older complaints may be outdated). Only report high confidence if multiple posts agree or a post clearly explains a structural reason (delisted content, discontinued feature, shut-down servers). If posts are ambiguous or contradictory, say so and use low/medium confidence.`;

  const text = await generateJson(prompt, classificationSchema);
  if (!text) return null;
  try {
    const parsed = classificationZodSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const steamForumsAdapter: ScraperAdapter = {
  source: "steam_forums",

  async fetchGameData(appId: number, gameName: string): Promise<EvidenceClaim[]> {
    const checkedAt = new Date();

    try {
      const posts = await fetchForumPosts(appId);
      if (posts.length === 0) return [];

      const classification = await classifyPosts(gameName, posts);
      if (!classification) return [];

      const mostRelevant = posts[0];
      return [
        {
          sourceKey: "steam_forums",
          claim: { type: "achievement_unobtainable_signal", value: classification.hasUnobtainableSignal },
          confidence: classification.confidence,
          reasoning: classification.reasoning,
          rawUrl: mostRelevant?.url,
          checkedAt,
        },
      ];
    } catch {
      return [];
    }
  },
};
