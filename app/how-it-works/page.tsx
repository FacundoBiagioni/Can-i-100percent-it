import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Package, Server, GitBranch, Bug, Ban, Clock, type LucideIcon } from "lucide-react";
import { VERDICT } from "@/lib/ui/verdict";
import type { AnalysisStatus } from "@/lib/pipeline/types";

export const metadata: Metadata = {
  title: "How it works | can i 100% it?",
  description: "Where each verdict comes from: the data sources, how the color is decided, and how required DLC are found.",
};

const SOURCES: { name: string; url?: string; what: string }[] = [
  {
    name: "Steam",
    url: "https://store.steampowered.com",
    what: "The game itself: its achievement list and unlock rates, its DLC, how many people are playing right now, and its Argentina store price.",
  },
  {
    name: "SteamHunters",
    url: "https://steamhunters.com",
    what: "A community-curated achievement database. It keeps the list of achievements that can no longer be unlocked, says whether 100% needs paid DLC, and measures how long players really took to unlock everything.",
  },
  {
    name: "Achievement Scouts",
    url: "https://achievement-scouts.com",
    what: "Short notes written by achievement hunters (\"Paid 'Phantom Liberty' DLC required\"), community tags, and a time to 100% for games SteamHunters has no figure for.",
  },
  {
    name: "Forums, guides and Wikipedia",
    what: "Steam discussion threads, Steam community guides and Wikipedia articles, read by an AI model to spot missable or bugged achievements and DLC mentions. Each reading is kept, so the same thread is never read twice.",
  },
  {
    name: "IsThereAnyDeal",
    url: "https://isthereanydeal.com",
    what: "The biggest discount the game has ever had on the Argentina store, to tell you when it's at its all-time low.",
  },
  {
    name: "Your reports",
    what: "The \"Is this verdict wrong?\" button on every game. Reports are reviewed by hand before they're used.",
  },
];

const RULES: { status: AnalysisStatus; when: string[] }[] = [
  {
    status: "red",
    when: [
      "SteamHunters marks at least one achievement as no longer obtainable: servers shut down, a feature was removed, an event ended for good. The game page names each one.",
      "Or a DLC that 100% needs can no longer be bought.",
      "For a game SteamHunters doesn't track: two independent sources report a permanent block, or the game needs multiplayer and nobody is playing it.",
    ],
  },
  {
    status: "yellow",
    when: [
      "Only for games without curated data: one source reports a block that nothing else confirms.",
      "Or there wasn't enough data to check the game at all.",
    ],
  },
  {
    status: "green",
    when: [
      "Nothing above applies. Required DLC, multiplayer and missable achievements are shown as requirements, but they never stop you from reaching 100%.",
    ],
  },
  {
    status: "no_achievements",
    when: ["The game has no Steam achievements, so there's nothing to complete."],
  },
];

const ICONS: { icon: LucideIcon; name: string; what: string }[] = [
  { icon: Package, name: "DLC", what: "Paid DLC needed for 100%, with what each one costs." },
  { icon: Server, name: "Multiplayer", what: "Some achievements need online play or other players." },
  { icon: GitBranch, name: "Missable", what: "Achievements you can lock yourself out of on one save. Still obtainable on a new one." },
  { icon: Bug, name: "Bugged", what: "Achievements players report as unreliable to unlock. Annoying, not impossible." },
  { icon: Ban, name: "Unobtainable", what: "Achievements nobody can unlock anymore. These are what make a game red." },
  { icon: Clock, name: "Time", what: "Median hours players took to unlock every achievement, from SteamHunters." },
];

function SectionHeader({ label, title, children }: { label: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-nav text-graphite">{label}</p>
      <h2 className="text-heading-lg font-semibold">{title}</h2>
      {children && <div className="max-w-xl text-body text-ash">{children}</div>}
    </div>
  );
}

export default function HowItWorks() {
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-32 px-4 pb-32 pt-24 sm:px-6">
      <section className="flex flex-col gap-6">
        <p className="text-nav text-graphite">How it works</p>
        <h1 className="text-display font-semibold text-balance">How a verdict is made.</h1>
        <p className="max-w-xl text-body text-ash">
          Every game is checked against several sources, and the answer depends on how solid the evidence is. Curated
          data from achievement hunters decides first; AI reads of forum threads only fill in what nothing curated
          covers.
        </p>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader label="Sources" title="Where the data comes from." />
        <div className="grid grid-cols-1 pl-px pt-px sm:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map((s) => (
            <div key={s.name} className="-ml-px -mt-px flex flex-col gap-3 border border-carbon p-4">
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-fit items-center gap-1 text-heading-sm font-semibold transition-colors hover:text-ash"
                >
                  {s.name}
                  <ArrowUpRight aria-hidden className="h-4 w-4 text-graphite" />
                </a>
              ) : (
                <span className="text-heading-sm font-semibold">{s.name}</span>
              )}
              <p className="text-body text-ash">{s.what}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader label="Verdicts" title="How the color is decided.">
          Red only on hard evidence. A single forum post can&apos;t make a game red, and when curated data says every
          achievement is obtainable, that&apos;s the answer.
        </SectionHeader>
        <dl className="grid grid-cols-1 pl-px pt-px md:grid-cols-2">
          {RULES.map((r) => {
            const v = VERDICT[r.status];
            const Icon = v.icon;
            return (
              <div key={r.status} className="-ml-px -mt-px flex flex-col gap-3 border border-carbon p-4">
                <dt className={`flex items-center gap-2 text-heading-sm font-semibold ${v.text}`}>
                  <Icon aria-hidden className="h-5 w-5 shrink-0" />
                  {v.label}
                </dt>
                <dd>
                  <ul className="flex flex-col gap-2">
                    {r.when.map((w) => (
                      <li key={w} className="text-body text-ash">
                        {w}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader label="DLC" title="Which DLC you actually need.">
          <p>
            Steam doesn&apos;t say which achievements come from which DLC, so it&apos;s worked out in two steps. First,
            SteamHunters says whether 100% needs paid DLC at all; if not, nothing is listed. If it does, an AI model
            matches the game&apos;s real achievement list against its real DLC list, guided by the achievement
            hunters&apos; notes.
          </p>
          <p className="mt-3">
            A DLC is only listed when real achievements back it, and the game page shows which ones (&quot;Needed for:
            ...&quot;). Cosmetics, soundtracks, artbooks and DLC that hasn&apos;t come out yet are never listed.
          </p>
        </SectionHeader>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader label="Icons" title="What the icons mean.">
          Lit up when they apply, dimmed when they don&apos;t. Hover or focus any icon on a game page for the details.
        </SectionHeader>
        <div className="grid grid-cols-1 pl-px pt-px sm:grid-cols-2 lg:grid-cols-3">
          {ICONS.map(({ icon: Icon, name, what }) => (
            <div key={name} className="-ml-px -mt-px flex items-start gap-4 border border-carbon p-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center border border-fog text-chalk">
                <Icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-body font-medium text-chalk">{name}</span>
                <span className="text-body text-ash">{what}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader label="Limits" title="What it can get wrong.">
          <ul className="flex flex-col gap-2">
            <li>Community data can lag behind: a fresh server shutdown or patch may take a while to show up.</li>
            <li>AI reads of forums and guides can misread a thread. They never decide a verdict on their own when curated data exists.</li>
            <li>Results are re-checked over time, oldest first, so a game&apos;s page may be a few days behind.</li>
            <li>
              When the AI is unavailable, a game keeps what its sources said at its last check, and its verdict still comes from
              curated data. It&apos;s read again as soon as the AI is back.
            </li>
            <li>Prices are Steam&apos;s Argentina store, in USD.</li>
          </ul>
          <p className="mt-3">If something looks wrong, use &quot;Is this verdict wrong?&quot; on the game&apos;s page.</p>
        </SectionHeader>
        <Link
          href="/"
          className="w-fit border border-fog px-2 py-1 text-nav font-medium transition-colors hover:bg-chalk hover:text-void"
        >
          Check a game
        </Link>
      </section>
    </main>
  );
}
