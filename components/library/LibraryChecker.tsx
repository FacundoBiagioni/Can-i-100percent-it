"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Ban, Package, PackageCheck, Trophy } from "lucide-react";
import type { LibraryGame } from "@/lib/steam/library";
import type { FlaggedGame } from "@/lib/library/status";
import { useT } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

const BATCH = 100;
const STORAGE_KEY = "library-profile";

type LibraryInfo = { steamId: string; personaName: string; avatar: string | null; totalGames: number; games: LibraryGame[] };
type Card = FlaggedGame & { name: string; playtimeMinutes: number };
type Filter = "all" | "impossible" | "dlc" | "owned" | "completed";

// Errors are kept as codes and worded at render time, so switching the
// language also switches a message already on screen.
type LibraryError = { code: string; partial: boolean };

const FILTER_BUTTON = "cursor-pointer border px-2 py-1 text-nav font-medium transition-colors";

function hours(minutes: number, t: Dictionary) {
  if (minutes < 60) return minutes > 0 ? t.library.card.underHour : t.library.card.notPlayed;
  return t.library.card.played(Math.round(minutes / 60).toLocaleString(t.numberLocale));
}

const LEGACY_CDN = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps";

/** Art to try in order: the store's current capsule, then the classic CDN
 * paths (games pulled from the store often still have them), then headers. */
function artCandidates(game: Card): { url: string; portrait: boolean }[] {
  const list = [
    game.capsule && { url: game.capsule, portrait: true },
    { url: `${LEGACY_CDN}/${game.appId}/library_600x900.jpg`, portrait: true },
    game.header && { url: game.header, portrait: false },
    { url: `${LEGACY_CDN}/${game.appId}/header.jpg`, portrait: false },
  ].filter((c): c is { url: string; portrait: boolean } => Boolean(c));
  return list.filter((c, i) => list.findIndex((o) => o.url === c.url) === i);
}

const isComplete = (g: Card) => g.progress !== null && g.progress.unlocked >= g.progress.total;
const hasCatch = (g: Card) => g.unobtainable > 0 || g.hasPaidDlc;
// A game at 100% proves every required DLC is owned, even for games not
// analyzed here yet (where `dlc` is unknown).
const dlcOwned = (g: Card) => isComplete(g) || (g.dlc !== null && g.dlc.owned >= g.dlc.required);
const needsDlc = (g: Card) => g.hasPaidDlc && !dlcOwned(g);

const TAG = "inline-flex items-center gap-1 bg-void/85 px-1.5 py-0.5 text-caption font-medium backdrop-blur-sm";

function Tags({ game, checkingDlc }: { game: Card; checkingDlc: boolean }) {
  const tags = useT().library.tags;
  const complete = isComplete(game);
  return (
    <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
      {complete && (
        <span className={`${TAG} text-pass`}>
          <Trophy aria-hidden className="h-3.5 w-3.5" />
          {tags.completed}
        </span>
      )}
      {game.unobtainable > 0 && (
        <span className={`${TAG} text-fail`}>
          <Ban aria-hidden className="h-3.5 w-3.5" />
          {tags.impossible(game.unobtainable)}
        </span>
      )}
      {game.hasPaidDlc &&
        (dlcOwned(game) ? (
          <span className={`${TAG} text-pass`}>
            <PackageCheck aria-hidden className="h-3.5 w-3.5" />
            {game.dlc && game.dlc.required > 1 ? tags.allDlcOwned : tags.dlcOwned}
          </span>
        ) : game.dlc && game.dlc.owned > 0 ? (
          <span className={`${TAG} text-unsure`}>
            <Package aria-hidden className="h-3.5 w-3.5" />
            {tags.someDlcOwned(game.dlc.owned, game.dlc.required)}
          </span>
        ) : (
          <span className={`${TAG} text-chalk`}>
            <Package aria-hidden className="h-3.5 w-3.5" />
            {checkingDlc ? <span className="motion-safe:animate-pulse">{tags.checkingDlc}</span> : tags.paidDlc}
          </span>
        ))}
    </div>
  );
}

/** Unlocked share in white, or all green once the game is at 100%. */
function ProgressBar({ game }: { game: Card }) {
  const p = game.progress!;
  return (
    <div className="relative h-1 w-full bg-obsidian" aria-hidden>
      <div
        className={`absolute inset-y-0 left-0 ${isComplete(game) ? "bg-pass" : "bg-chalk"}`}
        style={{ width: `${Math.min(100, (p.unlocked / p.total) * 100)}%` }}
      />
    </div>
  );
}

function GameCard({ game, checkingDlc }: { game: Card; checkingDlc: boolean }) {
  const t = useT();
  const c = t.library.card;
  const candidates = useMemo(() => artCandidates(game), [game]);
  const [index, setIndex] = useState(0);
  const capsule = useRef<HTMLDivElement>(null);
  const art = candidates[index];
  const p = game.progress;
  const percent = p ? Math.floor((p.unlocked / p.total) * 100) : null;

  // Tilt toward the pointer; written straight to CSS variables so moving the
  // mouse never re-renders the grid.
  const onPointerMove = (e: React.PointerEvent) => {
    const el = capsule.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 12}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  };
  const onPointerLeave = () => {
    const el = capsule.current;
    if (!el) return;
    for (const v of ["--rx", "--ry", "--gx", "--gy"]) el.style.removeProperty(v);
  };

  const label = [
    game.name,
    p && c.ariaAchievements(p.unlocked, p.total),
    game.unobtainable > 0 && c.ariaImpossible(game.unobtainable),
    game.hasPaidDlc && (dlcOwned(game) ? c.ariaDlcOwned : c.ariaNeedsDlc),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/games/${game.appId}`}
      aria-label={label}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="group flex flex-col gap-3 outline-none"
    >
      <div ref={capsule} className={`capsule relative aspect-[2/3] w-full overflow-hidden bg-cinder ${dlcOwned(game) ? "ring-1 ring-pass/60" : ""}`}>
        {art ? (
          <>
            {/* Landscape fallback art: fill the portrait frame with a blurred
                copy of itself instead of black bars, like Steam does. */}
            {!art.portrait && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={art.url} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl" />
            )}
            {/* Plain <img>: a library can show hundreds of covers, which would
                burn through the image optimizer's quota for no visible gain. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={art.url}
              src={art.url}
              alt=""
              loading="lazy"
              onError={() => setIndex((i) => i + 1)}
              className={`relative h-full w-full transition-[filter] duration-200 group-hover:brightness-110 ${art.portrait ? "object-cover" : "object-contain"}`}
            />
          </>
        ) : (
          <span className="flex h-full items-center justify-center p-3 text-center text-body font-medium text-ash">{game.name}</span>
        )}
        <div className="capsule-glare pointer-events-none absolute inset-0" />
        <Tags game={game} checkingDlc={checkingDlc} />
        {percent !== null && (
          <span className="absolute bottom-2 right-2 bg-void/85 px-1.5 py-0.5 text-nav font-semibold tabular-nums text-chalk backdrop-blur-sm">
            {percent}%
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5" aria-hidden>
        <span className="line-clamp-1 text-body font-medium text-chalk transition-colors group-hover:text-fog">{game.name}</span>
        {p && <ProgressBar game={game} />}
        {p && <span className="text-caption tabular-nums text-ash">{c.achievements(p.unlocked.toLocaleString(t.numberLocale), p.total.toLocaleString(t.numberLocale))}</span>}
        <span className="text-caption tabular-nums text-graphite">
          {hours(game.playtimeMinutes, t)}
          {game.medianHours !== null && !isComplete(game) && ` · ${c.toHundred(Math.max(1, Math.round(game.medianHours)).toLocaleString(t.numberLocale))}`}
        </span>
      </div>
    </Link>
  );
}

export default function LibraryChecker() {
  const t = useT();
  const L = t.library;
  const router = useRouter();
  const searchParams = useSearchParams();
  // This component only renders in the browser (useSearchParams under a
  // Suspense boundary on a static page), so storage is readable here.
  const [input, setInput] = useState(() => {
    const fromUrl = searchParams.get("profile");
    if (fromUrl) return fromUrl;
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [phase, setPhase] = useState<"idle" | "loading" | "checking" | "done" | "error">(() =>
    searchParams.get("profile") ? "loading" : "idle",
  );
  const [error, setError] = useState<LibraryError | null>(null);
  const [library, setLibrary] = useState<LibraryInfo | null>(null);
  const [checked, setChecked] = useState(0);
  const [untracked, setUntracked] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const runId = useRef(0);
  // Paid-DLC games being mapped right now (see the DLC pass in run()).
  const [dlcPass, setDlcPass] = useState<{ done: number; total: number; pending: number | null; limited: boolean } | null>(null);

  // Every state update in here happens after an await, so it's safe to start
  // from an effect (a shared /library?profile= link) as well as from submit.
  const run = useCallback(
    async (profile: string) => {
      const id = ++runId.current;
      try {
        localStorage.setItem(STORAGE_KEY, profile);
      } catch {}
      router.replace(`/library?profile=${encodeURIComponent(profile)}`, { scroll: false });

      const res = await fetch(`/api/library/owned?profile=${encodeURIComponent(profile)}`).catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;
      if (id !== runId.current) return;
      if (!data?.ok) {
        setError({ code: typeof data?.error === "string" ? data.error : "steam_unavailable", partial: false });
        setPhase("error");
        return;
      }
      const lib = data as LibraryInfo;
      setLibrary(lib);
      setPhase("checking");

      const byId = new Map(lib.games.map((g) => [g.appId, g]));
      const collected: FlaggedGame[] = [];
      for (let i = 0; i < lib.games.length; i += BATCH) {
        const appIds = lib.games.slice(i, i + BATCH).map((g) => g.appId);
        const r = await fetch("/api/library/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appIds, steamId: lib.steamId }),
        }).catch(() => null);
        const batch = r?.ok ? await r.json().catch(() => null) : null;
        if (id !== runId.current) return;
        if (!batch) {
          const code = r?.status === 429 ? "rate_limited" : "steamhunters_unavailable";
          setError({ code, partial: true });
          setPhase("error");
          return;
        }
        setChecked((c) => c + batch.checked);
        setUntracked((u) => u + batch.untracked);
        collected.push(...(batch.flagged as FlaggedGame[]));
        setCards((prev) => [
          ...prev,
          ...(batch.flagged as FlaggedGame[]).map((f) => ({
            ...f,
            name: byId.get(f.appId)?.name ?? `App ${f.appId}`,
            playtimeMinutes: byId.get(f.appId)?.playtimeMinutes ?? 0,
          })),
        ]);
      }
      setPhase("done");

      // DLC pass: for paid-DLC games nobody analyzed yet, map which DLC they
      // need (once, saved for good) so the card can say whether you own it.
      // One at a time to go easy on the AI quota. Skipped: games at 100%
      // (ownership is already proven) and games with nothing unlocked (no
      // achievement could prove it).
      const queue = collected.filter(
        (g) => g.hasPaidDlc && g.dlc === null && g.progress !== null && g.progress.unlocked > 0 && g.progress.unlocked < g.progress.total,
      );
      for (let i = 0; i < queue.length; i++) {
        const appId = queue[i].appId;
        setDlcPass({ done: i, total: queue.length, pending: appId, limited: false });
        const r = await fetch("/api/library/dlc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appId, steamId: lib.steamId }),
        }).catch(() => null);
        const out = r?.ok ? await r.json().catch(() => null) : null;
        if (id !== runId.current) return;
        if (!out || out.outcome === "daily_limit") {
          setDlcPass({ done: i, total: queue.length, pending: null, limited: true });
          return;
        }
        if (out.dlc) setCards((prev) => prev.map((c) => (c.appId === appId ? { ...c, dlc: out.dlc } : c)));
      }
      setDlcPass(queue.length > 0 ? { done: queue.length, total: queue.length, pending: null, limited: false } : null);
    },
    [router],
  );

  // Re-run a shared or reloaded /library?profile=... link.
  useEffect(() => {
    const fromUrl = searchParams.get("profile");
    // Kicked off from a callback: the check is async work against external
    // APIs, and state starts as "loading" already (see useState above).
    if (fromUrl) void Promise.resolve().then(() => run(fromUrl));
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(
    () =>
      [...cards].sort(
        // Games with a catch first; perfected ones after, most played first.
        (a, b) =>
          Number(hasCatch(b)) - Number(hasCatch(a)) ||
          b.unobtainable - a.unobtainable ||
          Number(b.hasPaidDlc) - Number(a.hasPaidDlc) ||
          b.playtimeMinutes - a.playtimeMinutes,
      ),
    [cards],
  );
  const impossibleCount = cards.filter((c) => c.unobtainable > 0).length;
  const dlcCount = cards.filter(needsDlc).length;
  const ownedCount = cards.filter((c) => c.hasPaidDlc && dlcOwned(c)).length;
  const catchCount = cards.filter(hasCatch).length;
  const completedCount = cards.filter(isComplete).length;
  const visible = sorted.filter((c) =>
    filter === "impossible"
      ? c.unobtainable > 0
      : filter === "dlc"
        ? needsDlc(c)
        : filter === "owned"
          ? c.hasPaidDlc && dlcOwned(c)
          : filter === "completed"
            ? isComplete(c)
            : true,
  );
  const total = library?.games.length ?? 0;
  const busy = phase === "loading" || phase === "checking";

  return (
    <div className="flex flex-col gap-16">
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ol className="flex flex-col pl-px pt-px">
          {[
            <>
              {L.steps.openBefore}{" "}
              <a
                href="https://steamcommunity.com/my/edit/settings"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-chalk underline underline-offset-4 hover:text-ash"
              >
                {L.steps.openLink}
                <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
              </a>{" "}
              {L.steps.openAfter}
            </>,
            <>
              {L.steps.setBefore} <span className="text-chalk">{L.steps.myProfile}</span> {L.steps.and}{" "}
              <span className="text-chalk">{L.steps.gameDetails}</span> {L.steps.to} <span className="text-chalk">{L.steps.public}</span>
              {L.steps.setAfter}
            </>,
            <>
              {L.steps.copyBefore} <span className="text-chalk">{L.steps.copyPageUrl}</span>
              {L.steps.copyMiddle} <span className="text-chalk">{L.inputPlaceholder}</span>.
            </>,
            <>{L.steps.paste}</>,
          ].map((step, i) => (
            <li key={i} className="-ml-px -mt-px flex gap-4 border border-carbon p-4">
              <span className="text-heading font-semibold tabular-nums text-graphite">{i + 1}</span>
              <span className="text-body text-ash">{step}</span>
            </li>
          ))}
        </ol>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            setPhase("loading");
            setError(null);
            setLibrary(null);
            setCards([]);
            setChecked(0);
            setUntracked(0);
            setDlcPass(null);
            setFilter("all");
            run(input.trim());
          }}
          className="flex flex-col gap-3 self-start"
        >
          <label htmlFor="profile" className="text-nav text-ash">
            {L.inputLabel}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="profile"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={L.inputPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="h-12 flex-1 border border-cinder bg-cinder px-4 text-base text-chalk outline-none placeholder:text-graphite focus:border-fog"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="h-12 cursor-pointer bg-chalk px-5 text-nav font-semibold text-void transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? L.checking : L.check}
            </button>
          </div>
          <p className="text-caption text-graphite">
            {L.privacy}
          </p>
          {error && (
            <p role="alert" className="text-body text-unsure">
              {L.errors[error.code] ?? L.errors.steam_unavailable}
              {error.partial && ` ${L.soFar}`}
            </p>
          )}
        </form>
      </section>

      {library && (
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {library.avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={library.avatar} alt="" className="h-10 w-10 border border-carbon" />
              )}
              <h2 className="text-heading-lg font-semibold">{L.whoseLibrary(library.personaName)}</h2>
            </div>
            <p className="text-body text-ash" role="status" aria-live="polite">
              {L.counts(library.totalGames.toLocaleString(t.numberLocale), total.toLocaleString(t.numberLocale))}{" "}
              {phase === "checking"
                ? L.progress(checked.toLocaleString(t.numberLocale), total.toLocaleString(t.numberLocale))
                : phase === "error"
                  ? L.stopped(checked.toLocaleString(t.numberLocale), total.toLocaleString(t.numberLocale))
                  : L.summary(catchCount, completedCount, untracked)}
            </p>
            {dlcPass && (
              <p className="text-caption text-graphite">
                {dlcPass.limited
                  ? L.dlcPass.limited(dlcPass.done, dlcPass.total)
                  : dlcPass.pending !== null
                    ? L.dlcPass.running(dlcPass.done, dlcPass.total)
                    : L.dlcPass.done(dlcPass.total)}
              </p>
            )}
            {total > 0 && (
              <div className="h-px w-full bg-carbon">
                <div className="h-px bg-chalk transition-[width] duration-300" style={{ width: `${Math.round((checked / total) * 100)}%` }} />
              </div>
            )}
          </div>

          {cards.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={L.filter}>
              {(
                [
                  ["all", L.filters.all(cards.length)],
                  ["impossible", L.filters.impossible(impossibleCount)],
                  ["dlc", L.filters.dlc(dlcCount)],
                  ...(ownedCount > 0 ? [["owned", L.filters.owned(ownedCount)]] : []),
                  ...(completedCount > 0 ? [["completed", L.filters.completed(completedCount)]] : []),
                ] as [Filter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={`${FILTER_BUTTON} ${filter === value ? "border-fog bg-chalk text-void" : "border-carbon text-ash hover:border-fog hover:text-chalk"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {visible.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {visible.map((g) => (
                <GameCard key={g.appId} game={g} checkingDlc={dlcPass?.pending === g.appId} />
              ))}
            </div>
          ) : (
            phase === "done" && (
              <p className="text-body text-ash">
                {L.goodNews}
              </p>
            )
          )}
        </section>
      )}
    </div>
  );
}
