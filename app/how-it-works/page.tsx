import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Package, Server, GitBranch, Bug, Ban, Clock, type LucideIcon } from "lucide-react";
import { VERDICT } from "@/lib/ui/verdict";
import type { AnalysisStatus } from "@/lib/pipeline/types";
import { getT } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t.meta.howItWorksTitle} | can i 100% it?`, description: t.meta.howItWorksDescription };
}

const SOURCES: { name: string | ((t: Dictionary) => string); url?: string; what: (t: Dictionary) => string }[] = [
  { name: "Steam", url: "https://store.steampowered.com", what: (t) => t.howItWorks.sources.steam },
  { name: "SteamHunters", url: "https://steamhunters.com", what: (t) => t.howItWorks.sources.steamhunters },
  { name: "Achievement Scouts", url: "https://achievement-scouts.com", what: (t) => t.howItWorks.sources.scouts },
  { name: (t) => t.howItWorks.sources.forumsName, what: (t) => t.howItWorks.sources.forums },
  { name: "IsThereAnyDeal", url: "https://isthereanydeal.com", what: (t) => t.howItWorks.sources.itad },
  { name: (t) => t.howItWorks.sources.reportsName, what: (t) => t.howItWorks.sources.reports },
];

const RULE_ORDER: AnalysisStatus[] = ["red", "yellow", "green", "no_achievements"];

const ICONS: { icon: LucideIcon; key: keyof Dictionary["howItWorks"]["icons"] }[] = [
  { icon: Package, key: "dlc" },
  { icon: Server, key: "multiplayer" },
  { icon: GitBranch, key: "missable" },
  { icon: Bug, key: "bugged" },
  { icon: Ban, key: "unobtainable" },
  { icon: Clock, key: "time" },
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

export default async function HowItWorks() {
  const t = await getT();
  const h = t.howItWorks;

  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-32 px-4 pb-32 pt-24 sm:px-6">
      <section className="flex flex-col gap-6">
        <p className="text-nav text-graphite">{h.label}</p>
        <h1 className="text-display font-semibold text-balance">{h.title}</h1>
        <p className="max-w-xl text-body text-ash">{h.intro}</p>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader label={h.sourcesLabel} title={h.sourcesTitle} />
        <div className="grid grid-cols-1 pl-px pt-px sm:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map((s) => {
            const name = typeof s.name === "string" ? s.name : s.name(t);
            return (
              <div key={name} className="-ml-px -mt-px flex flex-col gap-3 border border-carbon p-4">
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-fit items-center gap-1 text-heading-sm font-semibold transition-colors hover:text-ash"
                  >
                    {name}
                    <ArrowUpRight aria-hidden className="h-4 w-4 text-graphite" />
                  </a>
                ) : (
                  <span className="text-heading-sm font-semibold">{name}</span>
                )}
                <p className="text-body text-ash">{s.what(t)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader label={h.verdictsLabel} title={h.verdictsTitle}>
          {h.verdictsIntro}
        </SectionHeader>
        <dl className="grid grid-cols-1 pl-px pt-px md:grid-cols-2">
          {RULE_ORDER.map((status) => {
            const v = VERDICT[status];
            const Icon = v.icon;
            return (
              <div key={status} className="-ml-px -mt-px flex flex-col gap-3 border border-carbon p-4">
                <dt className={`flex items-center gap-2 text-heading-sm font-semibold ${v.text}`}>
                  <Icon aria-hidden className="h-5 w-5 shrink-0" />
                  {t.verdict[status].label}
                </dt>
                <dd>
                  <ul className="flex flex-col gap-2">
                    {h.rules[status].map((w) => (
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
        <SectionHeader label={h.dlcLabel} title={h.dlcTitle}>
          <p>{h.dlcBody1}</p>
          <p className="mt-3">{h.dlcBody2}</p>
        </SectionHeader>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader label={h.iconsLabel} title={h.iconsTitle}>
          {h.iconsIntro}
        </SectionHeader>
        <div className="grid grid-cols-1 pl-px pt-px sm:grid-cols-2 lg:grid-cols-3">
          {ICONS.map(({ icon: Icon, key }) => {
            const [name, what] = h.icons[key];
            return (
              <div key={key} className="-ml-px -mt-px flex items-start gap-4 border border-carbon p-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center border border-fog text-chalk">
                  <Icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-body font-medium text-chalk">{name}</span>
                  <span className="text-body text-ash">{what}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <SectionHeader label={h.limitsLabel} title={h.limitsTitle}>
          <ul className="flex flex-col gap-2">
            {h.limits.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="mt-3">{h.limitsOutro}</p>
        </SectionHeader>
        <Link
          href="/"
          className="w-fit border border-fog px-2 py-1 text-nav font-medium transition-colors hover:bg-chalk hover:text-void"
        >
          {h.cta}
        </Link>
      </section>
    </main>
  );
}
