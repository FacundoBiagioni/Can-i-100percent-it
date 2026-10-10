import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { errorEvents } from "@/lib/db/schema";

export type ErrorSource = "server" | "client" | "cron";

export type ErrorReport = {
  source: ErrorSource;
  message: string;
  stack?: string | null;
  path?: string | null;
  digest?: string | null;
};

const MAX_MESSAGE = 1000;
const MAX_STACK = 4000;
const MAX_PATH = 500;
const RETENTION_DAYS = 30;

// Not the site's bugs: a visitor closing the tab or navigating away mid-load.
const IGNORED = [/destination stream closed early/i, /^aborted$/i, /ECONNRESET/];

/** The first stack line pointing at code, which says where it broke. */
function topFrame(stack: string | null | undefined): string {
  return stack?.split("\n").find((l) => /^\s*at\s/.test(l) || l.includes("@"))?.trim() ?? "";
}

/**
 * Same place + same message = same error, so repeats group into one row.
 * Numbers and quoted values in the message are blanked first: "AppID 123
 * failed" and "AppID 456 failed" are one bug, not two.
 */
function fingerprint(r: ErrorReport): string {
  const message = r.message.replace(/\d+/g, "N").replace(/(["'`]).*?\1/g, "$1…$1");
  const frame = topFrame(r.stack).replace(/:\d+:\d+\)?$/, "").replace(/\?[^)]*/, "");
  return createHash("sha1").update(`${r.source}\n${message}\n${frame}`).digest("hex");
}

/**
 * Logs an error to the admin panel's error list. Query strings are dropped
 * from the path (they can carry what a visitor typed), and so is the admin
 * key. Never throws: a broken error log must not break the page reporting.
 */
export async function recordError(r: ErrorReport): Promise<void> {
  try {
    if (IGNORED.some((re) => re.test(r.message))) return;
    const message = (r.message || "Unknown error").slice(0, MAX_MESSAGE);
    const stack = r.stack?.slice(0, MAX_STACK) ?? null;
    // The admin panel's address is its password: never store it.
    const path = r.path?.split("?")[0].replace(/^\/admin\/[^/]+/, "/admin/…").slice(0, MAX_PATH) ?? null;
    await db
      .insert(errorEvents)
      .values({ fingerprint: fingerprint({ ...r, message }), source: r.source, message, stack, path, digest: r.digest ?? null })
      .onConflictDoUpdate({
        target: errorEvents.fingerprint,
        set: {
          count: sql`${errorEvents.count} + 1`,
          lastSeenAt: sql`now()`,
          resolved: false,
          stack,
          path,
          digest: r.digest ?? null,
        },
      });
  } catch {
    // Nowhere left to report to; Vercel's own logs still have it.
  }
}

/** Shorthand for a caught value of unknown type. */
export function recordException(source: ErrorSource, err: unknown, path?: string | null): Promise<void> {
  const e = err instanceof Error ? err : new Error(String(err));
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : null;
  return recordError({ source, message: e.message, stack: e.stack, path, digest });
}

/** Drops errors not seen for RETENTION_DAYS. Run daily by the cron. */
export async function purgeOldErrors(): Promise<number> {
  const deleted = await db
    .delete(errorEvents)
    .where(lt(errorEvents.lastSeenAt, sql`now() - interval '${sql.raw(String(RETENTION_DAYS))} days'`))
    .returning({ id: errorEvents.id });
  return deleted.length;
}
