import { createHash } from "node:crypto";
import { GoogleGenAI, ApiError, type Schema } from "@google/genai";
import { redis } from "@/lib/cache/redis";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// gemini-3.6-flash's free tier is capped at 20 requests/DAY (confirmed via a
// live 429 while testing) — nowhere near enough for a call on every
// analysis. gemini-3.5-flash-lite has a separate, much larger daily quota
// (per-model bucket) and is plenty capable for this project's classification
// tasks (short, well-structured extraction from a handful of text snippets).
const MODEL = "gemini-3.5-flash-lite";

// Same prompt, same answer: readings are kept this long, so re-checking a
// game whose forum posts/guides haven't changed costs no quota at all.
const ANSWER_TTL = 60 * 60 * 24 * 90;
const EXHAUSTED_KEY = "gemini:exhausted";
// The free quota resets at midnight Pacific time, so "today" is counted on
// that clock (en-CA formats as YYYY-MM-DD).
const quotaDay = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
const usageKey = () => `gemini:calls:${quotaDay()}`;
// Requests per day on the free tier for MODEL. Override if the plan changes.
const DAILY_LIMIT = Number(process.env.GEMINI_DAILY_LIMIT) || 500;

/** True while the daily free quota is known to be used up. Callers use it to
 * skip AI work up front and fall back to what's already stored. */
export async function aiExhausted(): Promise<boolean> {
  return redis ? Boolean(await redis.exists(EXHAUSTED_KEY)) : false;
}

/** Real Gemini requests made today (cached answers don't count). */
export async function aiCallsToday(): Promise<number> {
  return redis ? ((await redis.get<number>(usageKey())) ?? 0) : 0;
}

/** Requests left in today's quota (0 once it's known to be used up). */
export async function aiCallsLeft(): Promise<number> {
  if (await aiExhausted()) return 0;
  return Math.max(0, DAILY_LIMIT - (await aiCallsToday()));
}

/**
 * The daily quota error reads "...Please retry in 21h22m35.5s." A per-minute
 * limit says seconds; only a wait of minutes or more means the day's quota
 * is gone. Returns that wait in seconds, or null.
 */
function quotaResetSeconds(e: ApiError): number | null {
  const m = e.message.match(/retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i);
  if (!m) return null;
  const seconds = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Math.ceil(Number(m[3] ?? 0));
  return seconds >= 120 ? seconds : null;
}

/**
 * Generates JSON matching `schema`, retrying on transient overload errors.
 * Gemini's free tier returns 503 ("high demand") and 429 (rate limit)
 * fairly often under sustained use — confirmed while testing this project
 * against many games back to back. Returns null (never throws) so callers
 * can degrade gracefully same as any other unavailable source.
 *
 * Answers are cached by prompt, and once the daily quota runs out every call
 * returns null immediately until it resets, instead of each one retrying.
 */
export async function generateJson(
  prompt: string,
  schema: Schema,
  maxRetries = 2,
  options: { temperature?: number } = {},
): Promise<string | null> {
  const answerKey = `gemini:answer:${createHash("sha256").update(`${MODEL}\n${options.temperature ?? ""}\n${JSON.stringify(schema)}\n${prompt}`).digest("hex")}`;
  if (redis) {
    // Wrapped in an object: Upstash JSON-parses string values on read.
    const cached = await redis.get<{ text: string }>(answerKey);
    if (cached && typeof cached.text === "string") return cached.text;
    if (await aiExhausted()) return null;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (redis) {
        const used = await redis.incr(usageKey());
        if (used === 1) await redis.expire(usageKey(), 60 * 60 * 48);
      }
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema, temperature: options.temperature },
      });
      const text = response.text ?? null;
      if (text && redis) await redis.set(answerKey, { text }, { ex: ANSWER_TTL });
      return text;
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        const reset = quotaResetSeconds(e);
        if (reset !== null) {
          if (redis) await redis.set(EXHAUSTED_KEY, 1, { ex: reset });
          return null;
        }
      }
      const isRetryable = e instanceof ApiError && (e.status === 503 || e.status === 429);
      if (!isRetryable || attempt === maxRetries) return null;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt)); // 1s, 2s, 4s, ...
    }
  }
  return null;
}
