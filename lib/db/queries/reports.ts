import { and, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { communityReports } from "@/lib/db/schema";

/**
 * Keeps the privacy policy's promise on report emails: an email is only
 * kept while its report is pending, and never more than 12 months. Clears
 * the email (the report itself stays, anonymous). Run daily by the cron.
 * Returns how many emails were removed.
 */
export async function purgeReportEmails(): Promise<number> {
  const cleared = await db
    .update(communityReports)
    .set({ submittedByEmail: null })
    .where(
      and(
        isNotNull(communityReports.submittedByEmail),
        or(ne(communityReports.status, "pending"), lt(communityReports.createdAt, sql`now() - interval '12 months'`)),
      ),
    )
    .returning({ id: communityReports.id });
  return cleared.length;
}
