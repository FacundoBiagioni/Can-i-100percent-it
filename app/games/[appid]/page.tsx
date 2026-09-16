import { notFound } from "next/navigation";
import { getOrCreateGame } from "@/lib/db/queries/games";

export default async function GamePage(props: PageProps<"/games/[appid]">) {
  const { appid } = await props.params;
  const appId = Number(appid);
  if (!Number.isInteger(appId) || appId <= 0) notFound();

  const game = await getOrCreateGame(appId);
  if (!game) notFound();

  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex w-full max-w-xl flex-col items-center gap-4 text-center">
        {game.headerImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.headerImageUrl}
            alt={game.name}
            className="w-full max-w-md rounded-xl"
          />
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {game.name}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Steam AppID {game.id}
          {game.releaseDate ? ` · Released ${game.releaseDate}` : ""}
        </p>
      </div>

      <section className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          DLC ({game.dlc.length})
        </h2>
        {game.dlc.length === 0 ? (
          <p className="text-sm text-zinc-400">No DLC.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {game.dlc.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-800 dark:text-zinc-200">{d.name}</span>
                {d.isDelisted && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                    delisted
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-zinc-400">
        Verdict engine not wired up yet — this is raw Steam data only.
      </p>
    </main>
  );
}
