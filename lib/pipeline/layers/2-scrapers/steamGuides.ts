import { load } from "cheerio";
import { Type } from "@google/genai";
import { z } from "zod";
import { getOrFetch } from "@/lib/cache/redis";
import { CacheKeys, CacheTTL } from "@/lib/cache/keys";
import { generateJson } from "@/lib/ai/gemini";
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

async function listTopGuides(appId: number): Promise<GuideListing[]> {
  const res = await fetch(`https://steamcommunity.com/app/${appId}/guides/?browsefilter=toprated&p=1`);
  if (!res.ok) return [];

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
  return getOrFetch(CacheKeys.scrape("steam_guides", appId), CacheTTL.scrapeSuccess, async () => {
    const listing = await listTopGuides(appId);
    const matches = listing
      .filter((g) => TITLE_KEYWORDS.some((kw) => g.title.toLowerCase().includes(kw)))
      .slice(0, MAX_GUIDES_TO_READ);

    const guides: Guide[] = [];
    for (const match of matches) {
      const body = await fetchGuideBody(match.url);
      if (body) guides.push({ ...match, body });
    }
    return guides;
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

async function classifyGuides(gameName: string, guides: Guide[]) {
  if (guides.length === 0) return null;

  const guideSections = guides
    .map((g, i) => `--- Guide ${i + 1}: "${g.title}" ---\n${g.body}`)
    .join("\n\n");

  const prompt = `You are checking whether the Steam game "${gameName}" has any achievements that are permanently unobtainable — for example because required DLC/content was delisted, a companion app or online feature was discontinued, or multiplayer servers were shut down. This is NOT about achievements that are merely difficult, missable-but-still-possible, or grindy.

Here are community-written achievement guides for this game:

${guideSections}

Decide: do these guides state, anywhere, that some achievement can no longer be obtained? Community guide authors are usually well-informed and often note this explicitly with a reason and sometimes a date. If the guides say every achievement is obtainable and don't flag any exceptions, that's meaningful evidence too — report hasUnobtainableSignal as false with medium/high confidence in that case rather than leaving it ambiguous.`;

  const text = await generateJson(prompt, classificationSchema);
  if (!text) return null;
  try {
    const parsed = classificationZodSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
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

      return [
        {
          sourceKey: "steam_guides",
          claim: { type: "achievement_unobtainable_signal", value: classification.hasUnobtainableSignal },
          confidence: classification.confidence,
          reasoning: classification.reasoning,
          rawUrl: guides[0]?.url,
          checkedAt,
        },
      ];
    } catch {
      return [];
    }
  },
};
