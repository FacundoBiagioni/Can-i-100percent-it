import { load } from "cheerio";
import { getOrFetchWithTtl } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { classifyUnobtainableSignal, buildClaimsFromClassification } from "@/lib/ai/unobtainableClassifier";
import type { EvidenceClaim } from "../../types";
import type { ScraperAdapter } from "./types";

// Verified live 2026-09-28 against steamcommunity.com/app/:id/guides —
// first-party Steam, server-rendered HTML, no Cloudflare challenge.
// browsefilter=toprated surfaces the community's best-rated guides, which
// for a well-covered game reliably includes a dedicated "100% Achievement
// Guide" if one exists — far more likely to explicitly document permanently
// unobtainable achievements (with dates, causes) than a general listing.
const TITLE_KEYWORDS = ["100%", "achievement", "walkthrough"];
const MAX_GUIDES_TO_READ = 2;
// The relevant "this achievement is no longer obtainable" note is often
// near the END of a long guide (after the full achievement list) — naive
// truncation at a low limit cut it off entirely in testing. Gemini's
// context window comfortably fits full guides (even long ones run ~30K
// chars), so this is a generous safety cap, not a real truncation point.
const MAX_GUIDE_CHARS = 80000;

type GuideListing = { title: string; url: string };
type Guide = { title: string; url: string; body: string };

/** null distinguishes a real fetch failure from "200 OK, no guides listed". */
async function listTopGuides(appId: number): Promise<GuideListing[] | null> {
  const res = await fetch(`https://steamcommunity.com/app/${appId}/guides/?browsefilter=toprated&p=1`);
  if (!res.ok) return null;

  const $ = load(await res.text());
  const guides: GuideListing[] = [];

  $(".workshopItemCollectionContainer").each((_, el) => {
    const container = $(el);
    const url = container.find("a[href*='filedetails']").first().attr("href");
    const title = container.find(".workshopItemTitle").text().trim().replace(/\s+/g, " ");
    if (url && title) guides.push({ title, url });
  });

  return guides;
}

async function fetchGuideBody(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) return "";
  const $ = load(await res.text());
  const parts: string[] = [];
  $(".subSectionDesc").each((_, el) => {
    parts.push($(el).text().trim().replace(/\s+/g, " "));
  });
  return parts.join("\n\n").slice(0, MAX_GUIDE_CHARS);
}

async function fetchRelevantGuides(appId: number): Promise<Guide[]> {
  return getOrFetchWithTtl(
    CacheKeys.scrape("steam_guides", appId),
    async () => {
      const listing = await listTopGuides(appId);
      const matches = (listing ?? [])
        .filter((g) => TITLE_KEYWORDS.some((kw) => g.title.toLowerCase().includes(kw)))
        .slice(0, MAX_GUIDES_TO_READ);

      const guides: Guide[] = [];
      for (const match of matches) {
        const body = await fetchGuideBody(match.url);
        if (body) guides.push({ ...match, body });
      }
      return { guides, listingFailed: listing === null };
    },
    ({ guides, listingFailed }) =>
      guides.length === 0 && listingFailed ? CacheTTL.scrapeFailure : CacheTTL.scrapeSuccess,
  ).then((r) => r.guides);
}

async function classifyGuides(gameName: string, guides: Guide[]) {
  if (guides.length === 0) return null;

  const guideSections = guides
    .map((g, i) => `--- Guide ${i + 1}: "${g.title}" ---\n${g.body}`)
    .join("\n\n");

  return classifyUnobtainableSignal(
    gameName,
    "community-written achievement guides",
    guideSections,
    "Community guide authors are usually well-informed and often note this explicitly with a reason and sometimes a date. If the guides say every achievement is obtainable and don't flag any exceptions, that's meaningful evidence too — report hasUnobtainableSignal as false with medium/high confidence in that case rather than leaving it ambiguous.",
  );
}

export const steamGuidesAdapter: ScraperAdapter = {
  source: "steam_guides",

  async fetchGameData(appId: number, gameName: string): Promise<EvidenceClaim[]> {
    const checkedAt = new Date();

    try {
      const guides = await fetchRelevantGuides(appId);
      if (guides.length === 0) return [];

      const classification = await classifyGuides(gameName, guides);
      if (!classification) return [];

      return buildClaimsFromClassification("steam_guides", classification, guides[0]?.url, checkedAt);
    } catch {
      return [];
    }
  },
};
