import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { errorEvents } from "@/lib/db/schema";
import { isAdminKey } from "@/lib/admin/auth";
import { resolveErrors } from "../actions";
import SubmitButton from "../SubmitButton";
import AdminNav from "../AdminNav";

export const metadata: Metadata = {
  title: "Errores | can i 100% it?",
  robots: { index: false, follow: false },
};

const SOURCE_LABEL: Record<string, string> = { server: "Servidor", client: "Navegador", cron: "Tarea diaria" };

const when = (d: Date) =>
  d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

/** The site's error log (see lib/errors/record.ts): one row per distinct
 * error, newest first. */
export default async function AdminErrorsPage(props: PageProps<"/admin/[key]/errores">) {
  const { key } = await props.params;
  if (!isAdminKey(key)) notFound();
  const { ver } = await props.searchParams;
  const showResolved = ver === "resueltos";

  const [rows, counts] = await Promise.all([
    db
      .select()
      .from(errorEvents)
      .where(eq(errorEvents.resolved, showResolved))
      .orderBy(desc(errorEvents.lastSeenAt))
      .limit(100),
    db.select({ resolved: errorEvents.resolved, n: count() }).from(errorEvents).groupBy(errorEvents.resolved),
  ]);
  const countOf = (resolved: boolean) => counts.find((c) => c.resolved === resolved)?.n ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-12 px-4 pb-32 pt-24 sm:px-6">
      <header className="flex flex-col gap-6">
        <AdminNav adminKey={key} active="errors" />
        <p className="max-w-2xl text-body text-ash">
          Errores del servidor, del navegador de los visitantes y de las tareas diarias. Los repetidos se agrupan. Uno
          resuelto vuelve a aparecer si pasa otra vez, y los que no se repiten en 30 días se borran solos.
        </p>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-carbon">
        <nav className="flex gap-2">
          {[
            { label: "Sin resolver", n: countOf(false), href: `/admin/${key}/errores`, active: !showResolved },
            { label: "Resueltos", n: countOf(true), href: `/admin/${key}/errores?ver=resueltos`, active: showResolved },
          ].map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`-mb-px border-b-2 px-3 py-2 text-nav transition-colors ${
                tab.active ? "border-ember text-chalk" : "border-transparent text-graphite hover:text-chalk"
              }`}
            >
              {tab.label} <span className="tabular-nums">({tab.n})</span>
            </Link>
          ))}
        </nav>
        {!showResolved && rows.length > 1 && (
          <form action={resolveErrors} className="pb-2">
            <input type="hidden" name="key" value={key} />
            <SubmitButton className="rounded-md border border-carbon px-3 py-1.5 text-nav text-ash transition-colors hover:bg-cinder">
              Marcar todos como resueltos
            </SubmitButton>
          </form>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-body text-graphite">{showResolved ? "No hay errores resueltos." : "No hay errores sin resolver."}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((e) => (
            <li key={e.id} className="flex flex-col gap-3 rounded-lg border border-carbon bg-cinder/40 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-body font-semibold break-words text-chalk">{e.message}</p>
                <span className="shrink-0 text-caption tabular-nums text-graphite">
                  {e.count === 1 ? "1 vez" : `${e.count} veces`}
                </span>
              </div>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-nav text-ash">
                <span>{SOURCE_LABEL[e.source] ?? e.source}</span>
                {e.path &&
                  (e.path.startsWith("/admin") ? (
                    <span>{e.path}</span>
                  ) : (
                    <Link href={e.path} target="_blank" className="underline">
                      {e.path}
                    </Link>
                  ))}
                <span>Última vez: {when(e.lastSeenAt)}</span>
                {e.count > 1 && <span>Primera: {when(e.firstSeenAt)}</span>}
                {e.digest && <span className="text-graphite">digest {e.digest}</span>}
              </p>
              {e.stack && (
                <details className="text-caption text-graphite">
                  <summary className="cursor-pointer text-nav text-ash">Detalle técnico</summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-caption">{e.stack}</pre>
                </details>
              )}
              {!e.resolved && (
                <form action={resolveErrors}>
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="id" value={e.id} />
                  <SubmitButton className="rounded-md border border-pass/50 px-4 py-2 text-nav text-pass transition-colors hover:bg-pass/10">
                    Marcar como resuelto
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
