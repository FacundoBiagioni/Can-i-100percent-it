import { z } from "zod";
import { recordError } from "@/lib/errors/record";
import { overRateLimit } from "@/lib/rateLimit";

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).optional(),
  path: z.string().max(1000).optional(),
});

// Noise that isn't the site's bug: extensions, cross-origin scripts the
// browser hides ("Script error."), and a harmless layout warning.
const IGNORED = [/^Script error\.?$/i, /ResizeObserver loop/i, /extension:\/\//i, /^Load failed$/i, /^Failed to fetch$/i];

/** Errors from visitors' browsers (see components/errors/ErrorReporter). */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 204 });
  if (await overRateLimit(request, "errors", 20, 60 * 10)) return new Response(null, { status: 204 });

  const { message, stack, path } = parsed.data;
  if (IGNORED.some((re) => re.test(message) || (stack && re.test(stack)))) return new Response(null, { status: 204 });

  await recordError({ source: "client", message, stack, path });
  return new Response(null, { status: 204 });
}
