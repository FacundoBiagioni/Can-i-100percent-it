/* eslint-disable @next/next/no-img-element -- every image here is Steam's own
   CDN art at its native size; the image optimizer would add nothing. */
import Link from "next/link";
import { ArrowUpRight, Lock, Trophy } from "lucide-react";
import { CREATOR_PROFILE_URL, type CreatorProfile, type Showcase } from "@/lib/about/creatorProfile";

// Steam's own level-ring colors, by decade (lvl_0 ... lvl_90 in its CSS).
const LEVEL_COLORS = ["#9b9b9b", "#c02942", "#d95b43", "#fecc23", "#467a3c", "#4e8ddb", "#7652c9", "#c252c9", "#542437", "#997c52"];

const STATUS = {
  online: { label: "Currently Online", color: "text-[#57cbde]" },
  offline: { label: "Currently Offline", color: "text-[#898989]" },
  "in-game": { label: "Currently In-Game", color: "text-[#90ba3c]" },
} as const;

const country = (code: string | null) => {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

function LevelRing({ level }: { level: number }) {
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 text-[16px] text-white"
      style={{ borderColor: LEVEL_COLORS[Math.min(9, Math.floor(level / 10))] }}
    >
      {level}
    </span>
  );
}

function ShowcaseFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#0b0e12]/40">
      <h3 className="bg-gradient-to-r from-[#000000]/45 to-transparent px-3 py-2 text-[17px] font-light text-white">{title}</h3>
      <div className="p-3">{children}</div>
    </section>
  );
}

function ShowcaseBlock({ showcase }: { showcase: Showcase }) {
  if (showcase.kind === "artwork") {
    return (
      <ShowcaseFrame title="Featured Artwork Showcase">
        <a href={showcase.href} target="_blank" rel="noreferrer" className="block">
          <img src={showcase.image} alt="Featured artwork" className="w-full transition-[filter] duration-200 hover:brightness-110" loading="lazy" />
        </a>
      </ShowcaseFrame>
    );
  }
  if (showcase.kind === "achievements") {
    return (
      <ShowcaseFrame title="Achievement Showcase">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {showcase.stats.map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="text-[26px] font-light leading-tight text-white">{s.value}</span>
                <span className="text-[12px] uppercase tracking-wide text-[#8f98a0]">{s.label}</span>
              </div>
            ))}
          </div>
          <ul className="grid grid-cols-7 gap-1.5">
            {showcase.items.map((a, i) => (
              <li key={i} className="group/ach relative">
                <a
                  href={a.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${a.game}: ${a.name}`}
                  className="block aspect-square overflow-hidden bg-black/40 outline-offset-2"
                >
                  <img src={a.icon} alt="" className="h-full w-full transition-transform duration-200 group-hover/ach:scale-110" loading="lazy" />
                </a>
                {/* Steam-style tooltip; group-focus-within keeps it keyboard reachable. */}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-56 -translate-x-1/2 bg-[#c2c2c2] p-2 text-[12px] leading-snug text-[#3d3d3f] shadow-[0_0_12px_#000] group-focus-within/ach:block group-hover/ach:block"
                >
                  <span className="block text-[#6d6d6d]">{a.game}</span>
                  <span className="block font-bold text-[#222]">{a.name}</span>
                  {a.description && <span className="block">{a.description}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ShowcaseFrame>
    );
  }
  return (
    <ShowcaseFrame title="Completionist Showcase">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {showcase.games.map((g) => (
          <li key={g.appId}>
            {/* Into this site's own page for the game: is it still 100%-able? */}
            <Link href={`/games/${g.appId}`} aria-label={`${g.name || "Game"}: ${g.count} achievements`} className="group/game relative block overflow-hidden">
              <img
                src={g.header}
                alt=""
                loading="lazy"
                className="aspect-[460/215] w-full object-cover transition-[transform,filter] duration-300 group-hover/game:scale-105 group-hover/game:brightness-110"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/90 to-transparent px-2 pb-1.5 pt-5 text-[12px] text-white">
                <span className="truncate">{g.name}</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[#e8c25a]">
                  <Trophy aria-hidden className="h-3 w-3" />
                  {g.count}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ShowcaseFrame>
  );
}

/**
 * A recreation of the Steam profile page inside a Steam client-like window:
 * Steam won't let its own page be embedded (X-Frame-Options), so this draws
 * it from live profile data instead, in Steam's colors and type.
 */
export default function SteamProfileWindow({ profile }: { profile: CreatorProfile }) {
  const status = STATUS[profile.status.kind];
  const where = country(profile.countryCode);
  const xpPercent = profile.xp ? ((profile.xp.current - profile.xp.levelStart) / (profile.xp.levelEnd - profile.xp.levelStart)) * 100 : 0;
  const counts = profile.counts.filter((c) => ["Badges", "Games", "Reviews", "Artwork", "Friends"].includes(c.label));

  return (
    <div className="overflow-hidden border border-[#2a3a4d] font-[Arial,Helvetica,sans-serif] shadow-[0_40px_80px_-30px_rgba(26,159,255,0.25)]">
      {/* Client chrome: the top nav, then the address bar. */}
      <div className="flex items-center gap-6 bg-[#171d25] px-4 py-3 text-[13px] font-bold uppercase tracking-wide text-[#dcdedf]">
        <span className="hidden sm:inline">Store</span>
        <span className="hidden sm:inline">Library</span>
        <span className="border-b-2 border-[#1a9fff] pb-0.5 text-[#1a9fff]">Community</span>
        <span className="min-w-0 truncate">{profile.name}</span>
      </div>
      <div className="flex items-center gap-2 border-y border-black/40 bg-[#0e141b] px-3 py-1.5 text-[12px] text-[#8f98a0]">
        <Lock aria-hidden className="h-3 w-3 shrink-0 text-[#67c1f5]" />
        <span className="min-w-0 truncate">{CREATOR_PROFILE_URL}</span>
        <a
          href={CREATOR_PROFILE_URL}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex shrink-0 items-center gap-1 text-[#67c1f5] transition-colors hover:text-white"
        >
          Open on Steam
          <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
        </a>
      </div>

      <div
        className="bg-[#1b2838] bg-cover bg-top"
        style={profile.background ? { backgroundImage: `url(${profile.background})` } : undefined}
      >
        <div className="mx-auto flex max-w-[976px] flex-col px-3 pt-6 sm:px-6 sm:pt-10">
          {/* Header */}
          <div className="flex flex-col gap-6 bg-gradient-to-b from-black/30 to-black/60 p-5 sm:flex-row sm:items-start">
            <div className="relative h-[120px] w-[120px] shrink-0 sm:h-[166px] sm:w-[166px]">
              <img src={profile.avatar} alt={`${profile.name}'s Steam avatar`} className="h-full w-full" />
              {profile.avatarFrame && (
                <img src={profile.avatarFrame} alt="" aria-hidden className="pointer-events-none absolute -inset-[11%] h-[122%] w-[122%] max-w-none" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h2 className="truncate text-[24px] text-white">{profile.name}</h2>
              {where && (
                <p className="flex items-center gap-2 text-[13px] text-[#8f98a0]">
                  {profile.countryCode && (
                    <img src={`https://community.fastly.steamstatic.com/public/images/countryflags/${profile.countryCode.toLowerCase()}.gif`} alt="" className="h-[11px]" />
                  )}
                  {where}
                </p>
              )}
              {profile.summary.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-1 text-[13px] text-[#c6d4df]">
                  {profile.summary.map((p, i) =>
                    p.kind === "text" ? <span key={i}>{p.text}</span> : <img key={i} src={p.src} alt={p.alt} className="h-[18px] w-[18px]" />,
                  )}
                </p>
              )}
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-[268px]">
              <p className="flex items-center gap-2 text-[24px] text-white">
                Level <LevelRing level={profile.level} />
              </p>
              {profile.favoriteBadge && (
                <div className="flex items-center gap-3 bg-black/25 p-2">
                  <img src={profile.favoriteBadge.icon} alt="" className="h-12 w-12" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-white">{profile.favoriteBadge.name}</p>
                    <p className="text-[12px] text-[#8f98a0]">{profile.favoriteBadge.xp}</p>
                  </div>
                </div>
              )}
              {profile.xp && (
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 w-full bg-black/50" aria-hidden>
                    <div className="h-full bg-gradient-to-r from-[#47bfff] to-[#1a9fff]" style={{ width: `${xpPercent}%` }} />
                  </div>
                  <p className="text-[11px] text-[#8f98a0]">
                    {(profile.xp.levelEnd - profile.xp.current).toLocaleString("en-US")} XP to level {profile.level + 1}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 gap-4 bg-black/55 p-3 sm:p-5 lg:grid-cols-[1fr_268px]">
            <div className="flex min-w-0 flex-col gap-4">
              {profile.showcases.map((s, i) => (
                <ShowcaseBlock key={i} showcase={s} />
              ))}
            </div>
            <aside className="flex flex-col gap-6 text-[13px]">
              <p className={`text-[20px] font-light ${status.color}`}>
                {status.label}
                {profile.status.game && <span className="block text-[14px] text-[#90ba3c]">{profile.status.game}</span>}
              </p>
              {profile.badges.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[16px] text-[#c6d4df]">
                    Badges <span className="text-[#8f98a0]">{counts.find((c) => c.label === "Badges")?.value}</span>
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {profile.badges.map((b) => (
                      <li key={b.href}>
                        <a href={b.href} target="_blank" rel="noreferrer" title={`${b.title}\n${b.detail}`} aria-label={b.title} className="block">
                          <img src={b.icon} alt="" className="h-14 w-14 transition-transform duration-200 hover:scale-110" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ul className="flex flex-col gap-1.5">
                {counts
                  .filter((c) => c.label !== "Badges")
                  .map((c) => (
                    <li key={c.label} className="flex items-baseline gap-2">
                      <span className="text-[16px] text-[#c6d4df]">{c.label}</span>
                      <span className="text-[#8f98a0]">{c.value}</span>
                    </li>
                  ))}
              </ul>
              {profile.memberSince && (
                <p className="text-[12px] text-[#8f98a0]">
                  Member since{" "}
                  {new Date(profile.memberSince * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
            </aside>
          </div>
          <div className="h-6 sm:h-10" />
        </div>
      </div>
    </div>
  );
}
