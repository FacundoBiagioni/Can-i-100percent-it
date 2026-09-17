import { notFound } from "next/navigation";
import { getOrCreateGame } from "@/lib/db/queries/games";
import { getOrRunAnalysis } from "@/lib/pipeline/getOrRunAnalysis";
import { getEvidenceForGame } from "@/lib/db/queries/evidence";
import StatusBadge from "@/components/result/StatusBadge";
import ConfidencePill from "@/components/result/ConfidencePill";
import RequirementsSummary from "@/components/result/RequirementsSummary";
import AchievementFlagList from "@/components/result/AchievementFlagList";
import EvidenceAccordion from "@/components/result/EvidenceAccordion";

export default async function GamePage(props: PageProps<"/games/[appid]">) {
  const { appid } = await props.params;
  const appId = Number(appid);
  if (!Number.isInteger(appId) || appId <= 0) notFound();

  const game = await getOrCreateGame(appId);
  if (!game) notFound();

  const outcome = await getOrRunAnalysis(appId);
  const evidence = outcome.state === "ready" ? await getEvidenceForGame(appId) : [];

  return (
    <main className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex w-full max-w-xl flex-col items-center gap-3 text-center">
        {game.headerImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={game.headerImageUrl} alt={game.name} className="w-full max-w-md rounded-xl" />
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{game.name}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Steam AppID {game.id}
          {game.releaseDate ? ` · Released ${game.releaseDate}` : ""}
        </p>
      </div>

      {outcome.state === "pending" ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Another request is analyzing this game right now — refresh in a few seconds.
        </p>
      ) : (
        <div className="flex w-full max-w-xl flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <StatusBadge status={outcome.analysis.status} />
            <ConfidencePill confidence={outcome.analysis.confidence} />
          </div>

          <RequirementsSummary analysis={outcome.analysis} />
          <AchievementFlagList analysis={outcome.analysis} />
          <EvidenceAccordion items={evidence} />
        </div>
      )}
    </main>
  );
}
