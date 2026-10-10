"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { communityReports, errorEvents } from "@/lib/db/schema";
import { isAdminKey } from "@/lib/admin/auth";
import { runPipeline } from "@/lib/pipeline/orchestrator";

const STATUSES = ["pending", "accepted", "rejected"] as const;
type ReportStatus = (typeof STATUSES)[number];

/** Every action re-checks the key: server actions are plain POST endpoints. */
function authorize(formData: FormData): string {
  const key = formData.get("key");
  if (!isAdminKey(key)) throw new Error("unauthorized");
  return key as string;
}

/** Accepting (or un-accepting) re-runs the game's analysis right away, so the
 * page reflects it now instead of at the next weekly re-check. */
export async function setReportStatus(formData: FormData) {
  const key = authorize(formData);
  const id = Number(formData.get("id"));
  const status = formData.get("status") as ReportStatus;
  if (!Number.isInteger(id) || !STATUSES.includes(status)) return;

  const before = await db.query.communityReports.findFirst({ where: eq(communityReports.id, id) });
  if (!before || before.status === status) return;
  await db.update(communityReports).set({ status }).where(eq(communityReports.id, id));
  if (status === "accepted" || before.status === "accepted") {
    await runPipeline(before.gameId, "manual").catch(() => null);
  }
  revalidatePath(`/admin/${key}`);
}

export async function reanalyze(formData: FormData) {
  const key = authorize(formData);
  const appId = Number(formData.get("appId"));
  if (!Number.isInteger(appId) || appId <= 0) return;
  await runPipeline(appId, "manual").catch(() => null);
  revalidatePath(`/admin/${key}`);
}

/** Marks one error (or, without an id, every open one) as resolved. It
 * reopens by itself if it happens again. */
export async function resolveErrors(formData: FormData) {
  const key = authorize(formData);
  const id = Number(formData.get("id"));
  await db
    .update(errorEvents)
    .set({ resolved: true })
    .where(Number.isInteger(id) && id > 0 ? eq(errorEvents.id, id) : eq(errorEvents.resolved, false));
  revalidatePath(`/admin/${key}/errores`);
}
