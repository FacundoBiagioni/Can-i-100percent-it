import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { achievements, analysisResults, communityReports, games } from "@/lib/db/schema";
import { isAdminKey } from "@/lib/admin/auth";
import { aiCallsLeft } from "@/lib/ai/gemini";
import { reanalyze, setReportStatus } from "./actions";
import SubmitButton from "./SubmitButton";

// Accepting a report re-runs the game's analysis inside the action.
export const maxDuration = 120;

export const metadata: Metadata = {
  title: "Panel | can i 100% it?",
  robots: { index: false, follow: false },
};

const STATUSES = ["pending", "accepted", "rejected"] as const;
type ReportStatus = (typeof STATUSES)[number];
const STATUS_LABEL: Record<ReportStatus, string> = { pending: "Pendientes", accepted: "Aceptados", rejected: "Rechazados" };
const TYPE_LABEL: Record<string, string> = {
  confirmation: "Confirma el veredicto",
  dispute: "Dice que está mal",
  bug_report: "Logro con bug",
  server_status: "Servidores",
};

const VERDICT_LABEL: Record<string, string> = { green: "verde", yellow: "amarillo", red: "rojo", no_achievements: "sin logros" };

const when = (d: Date) =>
  d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

/** Private review page for community reports. Spanish only: it's for the
 * site's owner, reached through the secret link (see lib/admin/auth.ts). */
export default async function AdminPage(props: PageProps<"/admin/[key]">) {
  const { key } = await props.params;
  if (!isAdminKey(key)) notFound();
  const { estado } = await props.searchParams;
  const status: ReportStatus = STATUSES.includes(estado as ReportStatus) ? (estado as ReportStatus) : "pending";

  const [reports, counts, [analyzed], callsLeft] = await Promise.all([
    db
      .select({
        id: communityReports.id,
        gameId: communityReports.gameId,
        gameName: games.name,
        achievement: achievements.displayName,
        type: communityReports.reportType,
        body: communityReports.body,
        email: communityReports.submittedByEmail,
        createdAt: communityReports.createdAt,
        verdict: analysisResults.status,
      })
      .from(communityReports)
      .innerJoin(games, eq(games.id, communityReports.gameId))
      .leftJoin(achievements, eq(achievements.id, communityReports.achievementId))
      .leftJoin(analysisResults, eq(analysisResults.gameId, communityReports.gameId))
      .where(eq(communityReports.status, status))
      .orderBy(status === "pending" ? communityReports.createdAt : desc(communityReports.createdAt))
      .limit(100),
    db.select({ status: communityReports.status, n: count() }).from(communityReports).groupBy(communityReports.status),
    db.select({ n: count() }).from(analysisResults),
    aiCallsLeft(),
  ]);
  const countOf = (s: ReportStatus) => counts.find((c) => c.status === s)?.n ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-12 px-4 pb-32 pt-24 sm:px-6">
      <header className="flex flex-col gap-6">
        <p className="text-nav text-graphite">Panel</p>
        <h1 className="text-heading-lg font-semibold">Reportes</h1>
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-carbon bg-carbon sm:max-w-xl">
          {[
            ["Pendientes", countOf("pending")],
            ["Juegos analizados", analyzed.n],
            ["Gemini hoy (restan)", callsLeft],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 bg-void p-4">
              <dt className="text-caption text-graphite">{label}</dt>
              <dd className="text-heading-sm font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <form action={reanalyze} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="key" value={key} />
        <label className="flex flex-col gap-2 text-nav text-ash">
          Re-analizar un juego (AppID)
          <input
            name="appId"
            inputMode="numeric"
            pattern="[0-9]+"
            required
            className="w-48 rounded-md border border-carbon bg-cinder px-3 py-2 text-body text-chalk outline-none focus:border-ash"
          />
        </label>
        <SubmitButton className="rounded-md border border-carbon px-4 py-2 text-nav text-chalk transition-colors hover:bg-cinder">
          Re-analizar
        </SubmitButton>
      </form>

      <nav className="flex gap-2 border-b border-carbon">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/${key}?estado=${s}`}
            className={`-mb-px border-b-2 px-3 py-2 text-nav transition-colors ${
              s === status ? "border-ember text-chalk" : "border-transparent text-graphite hover:text-chalk"
            }`}
          >
            {STATUS_LABEL[s]} <span className="tabular-nums">({countOf(s)})</span>
          </Link>
        ))}
      </nav>

      {reports.length === 0 ? (
        <p className="text-body text-graphite">No hay reportes {STATUS_LABEL[status].toLowerCase()}.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reports.map((r) => (
            <li key={r.id} className="flex flex-col gap-4 rounded-lg border border-carbon bg-cinder/40 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <Link href={`/games/${r.gameId}`} target="_blank" className="text-heading-sm font-semibold hover:underline">
                  {r.gameName}
                </Link>
                <span className="text-caption text-graphite">
                  #{r.id} · {when(r.createdAt)}
                </span>
              </div>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-nav text-ash">
                <span>{TYPE_LABEL[r.type] ?? r.type}</span>
                {r.achievement && <span>Logro: {r.achievement}</span>}
                <span>Veredicto actual: {r.verdict ? VERDICT_LABEL[r.verdict] : "sin analizar"}</span>
                {r.email && (
                  <a href={`mailto:${r.email}`} className="underline">
                    {r.email}
                  </a>
                )}
              </p>
              <p className="whitespace-pre-wrap text-body text-chalk">{r.body}</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.filter((s) => s !== status).map((s) => (
                  <form key={s} action={setReportStatus}>
                    <input type="hidden" name="key" value={key} />
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value={s} />
                    <SubmitButton
                      className={`rounded-md border px-4 py-2 text-nav transition-colors ${
                        s === "accepted"
                          ? "border-pass/50 text-pass hover:bg-pass/10"
                          : s === "rejected"
                            ? "border-fail/50 text-fail hover:bg-fail/10"
                            : "border-carbon text-ash hover:bg-cinder"
                      }`}
                    >
                      {s === "accepted" ? "Aceptar y re-analizar" : s === "rejected" ? "Rechazar" : "Volver a pendiente"}
                    </SubmitButton>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
