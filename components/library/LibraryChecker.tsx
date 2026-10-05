"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Ban, Package } from "lucide-react";
import type { LibraryGame } from "@/lib/steam/library";
import type { FlaggedGame } from "@/lib/library/status";

const BATCH = 100;
const STORAGE_KEY = "library-profile";

type LibraryInfo = { steamId: string; personaName: string; avatar: string | null; totalGames: number; games: LibraryGame[] };
type Card = FlaggedGame & { name: string; playtimeMinutes: number };
type Filter = "all" | "impossible" | "dlc";

const ERRORS: Record<string, string> = {
  invalid_input: "That doesn't look like a Steam profile. Paste the full link to your profile page.",
  profile_not_found: "No Steam profile matches that link. Check it's copied completely.",
  private_profile: "This profile is private. Set \"My profile\" to Public (step 2), then try again.",
  private_games:
    "Your game list is private. Set \"Game details\" to Public (step 2), then try again. Steam can take a few minutes to apply the change.",
  no_games: "This profile doesn't own any games yet.",
  steam_unavailable: "Steam didn't answer. Please try again in a minute.",
  steamhunters_unavailable: "Couldn't reach the achievement database. Please try again in a minute.",
  rate_limited: "Too many checks from this connection. Please try again in a bit.",
};

const FILTER_BUTTON = "cursor-pointer border px-2 py-1 text-nav font-medium transition-colors";

function hours(minutes: number) {
  if (minutes < 60) return minutes > 0 ? "<1 h played" : "Not played";
  return `${Math.round(minutes / 60).toLocaleString("en-US")} h played`;
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

function GameCard({ game }: { game: Card }) {
  const candidates = useMemo(() => artCandidates(game), [game]);
  const [index, setIndex] = useState(0);
  const art = candidates[index];
  return (
    <Link href={`/games/${game.appId}`} className="group -ml-px -mt-px flex flex-col border border-carbon transition-colors hover:bg-cinder">
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-cinder">
        {art ? (
          // Plain <img>: a library can show hundreds of covers, which would
          // burn through the image optimizer's quota for no visible gain.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={art.url}
            src={art.url}
            alt={game.name}
            loading="lazy"
            onError={() => setIndex((i) => i + 1)}
            className={`h-full w-full ${art.portrait ? "object-cover" : "object-contain"}`}
          />
        ) : (
          <span className="flex h-full items-center justify-center p-3 text-center text-body font-medium text-ash">{game.name}</span>
        )}
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-void/90 p-2">
          {game.unobtainable > 0 && (
            <span className="inline-flex items-center gap-1 border border-fail px-1.5 py-0.5 text-caption font-medium text-fail">
              <Ban aria-hidden className="h-3.5 w-3.5" />
              {game.unobtainable} impossible
            </span>
          )}
          {game.hasPaidDlc && (
            <span className="inline-flex items-center gap-1 border border-fog px-1.5 py-0.5 text-caption font-medium text-chalk">
              <Package aria-hidden className="h-3.5 w-3.5" />
              Paid DLC
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-0.5 p-2">
        <span className="line-clamp-1 text-body font-medium text-chalk">{game.name}</span>
        <span className="text-caption text-graphite">{hours(game.playtimeMinutes)}</span>
      </div>
    </Link>
  );
}

export default function LibraryChecker() {
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
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryInfo | null>(null);
  const [checked, setChecked] = useState(0);
  const [untracked, setUntracked] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const runId = useRef(0);

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
        setError(ERRORS[data?.error] ?? ERRORS.steam_unavailable);
        setPhase("error");
        return;
      }
      const lib = data as LibraryInfo;
      setLibrary(lib);
      setPhase("checking");

      const byId = new Map(lib.games.map((g) => [g.appId, g]));
      for (let i = 0; i < lib.games.length; i += BATCH) {
        const appIds = lib.games.slice(i, i + BATCH).map((g) => g.appId);
        const r = await fetch("/api/library/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appIds }),
        }).catch(() => null);
        const batch = r?.ok ? await r.json().catch(() => null) : null;
        if (id !== runId.current) return;
        if (!batch) {
          const code = r?.status === 429 ? "rate_limited" : "steamhunters_unavailable";
          setError(`${ERRORS[code]} Showing what was checked so far.`);
          setPhase("error");
          return;
        }
        setChecked((c) => c + batch.checked);
        setUntracked((u) => u + batch.untracked);
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
        (a, b) => b.unobtainable - a.unobtainable || Number(b.hasPaidDlc) - Number(a.hasPaidDlc) || b.playtimeMinutes - a.playtimeMinutes,
      ),
    [cards],
  );
  const impossibleCount = cards.filter((c) => c.unobtainable > 0).length;
  const dlcCount = cards.filter((c) => c.hasPaidDlc).length;
  const visible = sorted.filter((c) => (filter === "impossible" ? c.unobtainable > 0 : filter === "dlc" ? c.hasPaidDlc : true));
  const total = library?.games.length ?? 0;
  const busy = phase === "loading" || phase === "checking";

  return (
    <div className="flex flex-col gap-16">
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ol className="flex flex-col pl-px pt-px">
          {[
            <>
              Open your{" "}
              <a
                href="https://steamcommunity.com/my/edit/settings"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-chalk underline underline-offset-4 hover:text-ash"
              >
                Steam privacy settings
                <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
              </a>{" "}
              and sign in if asked.
            </>,
            <>
              Set <span className="text-chalk">My profile</span> and <span className="text-chalk">Game details</span> to{" "}
              <span className="text-chalk">Public</span>. Nothing else needs to change.
            </>,
            <>
              Copy your profile link: on Steam, click your name and choose{" "}
              <span className="text-chalk">Copy Page URL</span>, or copy it from the browser. It looks like{" "}
              <span className="text-chalk">steamcommunity.com/id/yourname</span>.
            </>,
            <>Paste it here and check. Only games that can&apos;t be fully completed, or that need paid DLC, show up.</>,
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
            setFilter("all");
            run(input.trim());
          }}
          className="flex flex-col gap-3 self-start"
        >
          <label htmlFor="profile" className="text-nav text-ash">
            Steam profile link
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="profile"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="steamcommunity.com/id/yourname"
              autoComplete="off"
              spellCheck={false}
              className="h-12 flex-1 border border-cinder bg-cinder px-4 text-base text-chalk outline-none placeholder:text-graphite focus:border-fog"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="h-12 cursor-pointer bg-chalk px-5 text-nav font-semibold text-void transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Checking…" : "Check library"}
            </button>
          </div>
          <p className="text-caption text-graphite">
            Your library is read once from Steam&apos;s public data. Nothing is stored about you.
          </p>
          {error && (
            <p role="alert" className="text-body text-unsure">
              {error}
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
              <h2 className="text-heading-lg font-semibold">{library.personaName}&apos;s library</h2>
            </div>
            <p className="text-body text-ash" role="status" aria-live="polite">
              {library.totalGames.toLocaleString("en-US")} games, {total.toLocaleString("en-US")} with achievements.{" "}
              {phase === "checking"
                ? `Checking ${checked.toLocaleString("en-US")} of ${total.toLocaleString("en-US")}…`
                : phase === "error"
                  ? `Stopped after checking ${checked.toLocaleString("en-US")} of ${total.toLocaleString("en-US")}.`
                  : `${cards.length} can't be completed without a catch${untracked > 0 ? ` · ${untracked} not covered by the achievement database yet` : ""}.`}
            </p>
            {total > 0 && (
              <div className="h-px w-full bg-carbon">
                <div className="h-px bg-chalk transition-[width] duration-300" style={{ width: `${Math.round((checked / total) * 100)}%` }} />
              </div>
            )}
          </div>

          {cards.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
              {(
                [
                  ["all", `All ${cards.length}`],
                  ["impossible", `Impossible ${impossibleCount}`],
                  ["dlc", `Needs paid DLC ${dlcCount}`],
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
            <div className="grid grid-cols-2 pl-px pt-px sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {visible.map((g) => (
                <GameCard key={g.appId} game={g} />
              ))}
            </div>
          ) : (
            phase === "done" && (
              <p className="text-body text-ash">
                Good news: every game in this library with achievements can be completed without paid DLC.
              </p>
            )
          )}
        </section>
      )}
    </div>
  );
}
