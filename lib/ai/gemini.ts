import { GoogleGenAI, ApiError, type Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// gemini-3.6-flash's free tier is capped at 20 requests/DAY (confirmed via a
// live 429 while testing) — nowhere near enough for a call on every
// analysis. gemini-3.5-flash-lite has a separate, much larger daily quota
// (per-model bucket) and is plenty capable for this project's classification
// tasks (short, well-structured extraction from a handful of text snippets).
const MODEL = "gemini-3.5-flash-lite";

/**
 * Generates JSON matching `schema`, retrying on transient overload errors.
 * Gemini's free tier returns 503 ("high demand") and 429 (rate limit)
 * fairly often under sustained use — confirmed while testing this project
 * against many games back to back. Returns null (never throws) so callers
 * can degrade gracefully same as any other unavailable source.
 */
export async function generateJson(
  prompt: string,
  schema: Schema,
  maxRetries = 2,
  options: { temperature?: number } = {},
): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema, temperature: options.temperature },
      });
      return response.text ?? null;
    } catch (e) {
      const isRetryable = e instanceof ApiError && (e.status === 503 || e.status === 429);
      if (!isRetryable || attempt === maxRetries) return null;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt)); // 1s, 2s, 4s, ...
    }
  }
  return null;
}
