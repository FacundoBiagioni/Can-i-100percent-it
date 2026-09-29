import { notFound } from "next/navigation";
import { getOrCreateGame } from "@/lib/db/queries/games";
import { getAppDetails } from "@/lib/pipeline/layers/1-steam/client";
import { getCachedAnalysis } from "@/lib/pipeline/getOrRunAnalysis";
import { getEvidenceForGame } from "@/lib/db/queries/evidence";
import StatusBadge from "@/components/result/StatusBadge";
import ConfidencePill from "@/components/result/ConfidencePill";
import StatusIconRow from "@/components/result/StatusIconRow";
import RequirementsSummary from "@/components/result/RequirementsSummary";
import AchievementFlagList from "@/components/result/AchievementFlagList";
import EvidenceAccordion from "@/components/result/EvidenceAccordion";
import AnalysisLoader from "@/components/result/AnalysisLoader";

export default async function GamePage(props: PageProps<"/games/[appid]">) {
  const { appid } = await props.params;
  const appId = Number(appid);
  if (!Number.isInteger(appId) || appId <= 0) notFound();

  const game = await getOrCreateGame(appId);
  if (!game) notFound();

  // Redundant with getOrCreateGame's own Steam call, but cheap (24h cache)
  // — the DB row only stores the small header image, not the hero-sized one.
  const details = await getAppDetails(appId);

  // Read-only check — never blocks the page on a first-time pipeline run.
  // If nothing's cached yet, AnalysisLoader kicks the run off client-side
  // and swaps itself for the real result once it lands, no manual reload.
  const analysis = await getCachedAnalysis(appId);
  const evidence = analysis ? await getEvidenceForGame(appId) : [];

  return (
    <main className="flex flex-1 flex-col bg-black">
      <div className="relative flex h-[42vh] min-h-[260px] w-full items-end overflow-hidden">
        {(details?.backgroundImage || game.headerImageUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={details?.backgroundImage || game.headerImageUrl!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
        <div className="relative flex w-full flex-col items-center gap-1 px-6 pb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-4xl">
            {game.name}
          </h1>
          <p className="text-sm text-zinc-300">
            Steam AppID {game.id}
            {game.releaseDate ? ` · Released ${game.releaseDate}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
        {analysis ? (
          <div className="flex w-full max-w-xl flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <StatusBadge status={analysis.status} />
              <ConfidencePill confidence={analysis.confidence} />
            </div>

            <StatusIconRow analysis={analysis} />

            <RequirementsSummary analysis={analysis} />
            <AchievementFlagList analysis={analysis} />
            <EvidenceAccordion items={evidence} />
          </div>
        ) : (
          <AnalysisLoader appId={appId} />
        )}
      </div>
    </main>
  );
}
