import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SteamProfileWindow from "@/components/about/SteamProfileWindow";
import { CREATOR_PROFILE_URL, getCreatorProfile } from "@/lib/about/creatorProfile";

export const metadata: Metadata = {
  title: "About | can i 100% it?",
  description: "can i 100% it? is made by Biagio360, an achievement hunter. See the creator's Steam profile.",
};

// The profile's level, badges and showcases change over time; refresh every 6 hours.
export const revalidate = 21600;

export default async function AboutPage() {
  const profile = await getCreatorProfile();
  const perfect = profile?.showcases.flatMap((s) => (s.kind === "achievements" ? s.stats : [])).find((s) => s.label === "Perfect Games")?.value;

  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-16 px-4 pb-32 pt-24 sm:px-6">
      <section className="flex flex-col gap-6">
        <p className="text-nav text-graphite">About</p>
        <h1 className="text-display font-semibold text-balance">The person behind it.</h1>
        <div className="flex max-w-xl flex-col gap-4 text-body text-ash">
          <p>
            can i 100% it? is made by <span className="text-chalk">Biagio360</span>, an achievement hunter
            {perfect ? ` with ${perfect} perfect games on Steam` : ""}.
          </p>
          <p>
            It exists to answer one question before you buy or start a game: can every achievement still be unlocked, and
            what will it take? The data, the verdicts and the design are a one-person project.
          </p>
        </div>
      </section>

      {profile ? (
        <SteamProfileWindow profile={profile} />
      ) : (
        <a
          href={CREATOR_PROFILE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1 border border-fog px-2 py-1 text-nav font-medium transition-colors hover:bg-chalk hover:text-void"
        >
          See the Steam profile
          <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
        </a>
      )}

      <Link href="/" className="w-fit border border-fog px-2 py-1 text-nav font-medium transition-colors hover:bg-chalk hover:text-void">
        Check a game
      </Link>
    </main>
  );
}
