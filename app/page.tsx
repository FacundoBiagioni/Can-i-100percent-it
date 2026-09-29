import SearchBox from "@/components/search/SearchBox";
import GameCollageBackground from "@/components/home/GameCollageBackground";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24">
      <GameCollageBackground />
      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl">
            Can i 100% it?
          </h1>
          <p className="max-w-sm text-sm text-zinc-300 sm:text-base">
            Search a Steam game to see if getting 100% of the achievements is realistically possible today.
          </p>
        </div>
        <SearchBox size="lg" />
      </div>
    </main>
  );
}
