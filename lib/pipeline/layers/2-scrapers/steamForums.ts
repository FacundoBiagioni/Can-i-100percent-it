import { load } from "cheerio";
import { getOrFetchWithTtl } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { classifyUnobtainableSignal, buildClaimsFromClassification } from "@/lib/ai/unobtainableClassifier";
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

/** Returns null on a non-2xx response — distinct from "200 OK, zero matches" — so the
 * caller can tell a real failure/rate-limit apart from a genuinely quiet game. */
async function searchDiscussions(appId: number, query: string): Promise<ForumPost[] | null> {
  const url = `https://steamcommunity.com/app/${appId}/discussions/search/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

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
  return getOrFetchWithTtl(
    CacheKeys.scrape("steam_forums", appId),
    async () => {
      const results = await Promise.all(SEARCH_QUERIES.map((q) => searchDiscussions(appId, q)));
      const anyQueryFailed = results.some((r) => r === null);
      const seen = new Set<string>();
      const merged: ForumPost[] = [];
      for (const post of results.flatMap((r) => r ?? [])) {
        if (seen.has(post.url)) continue;
        seen.add(post.url);
        merged.push(post);
      }
      return { merged, anyQueryFailed };
    },
    ({ merged, anyQueryFailed }) =>
      merged.length === 0 && anyQueryFailed ? CacheTTL.scrapeFailure : CacheTTL.scrapeSuccess,
  ).then((r) => r.merged);
}

async function classifyPosts(gameName: string, posts: ForumPost[]) {
  if (posts.length === 0) return null;

  const postLines = posts
    .map((p, i) => `${i + 1}. "${p.title}" — "${p.excerpt}"${p.timestampMs ? ` (posted ${new Date(p.timestampMs).toISOString().slice(0, 10)})` : ""}`)
    .join("\n");

  return classifyUnobtainableSignal(
    gameName,
    "Steam Community forum posts that matched a search for complaints about unobtainable/impossible/bugged achievements",
    postLines,
    "Ignore posts that are about difficulty, skill issues, or bugs that were later patched (check dates — older complaints may be outdated). Only report high confidence if multiple posts agree or a post clearly explains a structural reason (delisted content, discontinued feature, shut-down servers). If posts are ambiguous or contradictory, say so and use low/medium confidence.",
  );
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
      return buildClaimsFromClassification("steam_forums", classification, mostRelevant?.url, checkedAt);
    } catch {
      return [];
    }
  },
};
